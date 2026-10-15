/**
 * El historial del taller: los ultimos trabajos de cada herramienta, guardados
 * en el propio navegador.
 *
 * Nacio en el Hilo Generator y se saco aqui cuando lo pidieron las otras tres.
 * Lo comun es todo lo que no depende de que se este haciendo: guardar solo
 * mientras se trabaja, volver al trabajo al ir atras o recargar, la lista con
 * sus miniaturas y el tope de los diez ultimos. Lo propio de cada herramienta
 * —que es un trabajo, como se fotografia y como se vuelve a montar— lo pone
 * ella en `snapshot` y `restore`.
 *
 * Va en IndexedDB y no en `localStorage` porque un trabajo lleva sus imagenes
 * y sus videos, y `localStorage` solo guarda texto y se llena con cinco megas.
 * Nada de esto sale del equipo: es la misma promesa que el resto del taller.
 *
 * Hay dos almacenes. `works` tiene las fichas —textos, medidas, encuadres— y es
 * pequeño; `files` tiene los archivos, cada uno una sola vez. Estan separados
 * porque la ficha se vuelve a guardar a cada cambio, y reescribir un video de
 * cien megas por cada letra que se teclea no es una opcion: el archivo se
 * escribe la primera vez y lo que se repite es solo la ficha.
 *
 * Los datos de cada herramienta citan sus archivos con propiedades `fileId`.
 * Es un convenio, y es lo que permite saber que archivos siguen en uso sin
 * que este modulo entienda los datos de nadie.
 */
import "./historial.css";

/** Un archivo del trabajo, con el id con el que lo citan sus datos. */
export interface SavedFile {
  id: string;
  file: File;
}

/** Lo que la herramienta cuenta de su trabajo cada vez que se guarda. */
export interface Snapshot<T> {
  /** Lo que hace falta para volver a montarlo. Se guarda tal cual, como JSON. */
  data: T;
  /** Los archivos que citan esos datos por su `fileId`. */
  files: SavedFile[];
  /** Con que se reconoce en la lista: el primer texto, casi siempre. */
  title: string;
  /** La miniatura, como `data:`, para no depender de nada al listarla. */
  thumb: string;
  /** Sin nada que merezca guardarse todavia: ni texto ni archivos. */
  empty: boolean;
}

export interface HistoryConfig<T> {
  /** El id de la herramienta. Es tambien el nombre de su base. */
  tool: string;
  /** La seccion vacia donde se pinta la lista. */
  host: HTMLElement;
  /** El titulo de la seccion: «Últimos hilos», «Últimas noticias»… */
  heading: string;
  /** El boton de empezar otro: «Nuevo hilo», «Nueva noticia»… */
  freshLabel: string;
  snapshot(): Snapshot<T>;
  /** Monta un trabajo guardado. `file` saca de la base el archivo de un id. */
  restore(data: T, file: (id: string) => Promise<File | null>): Promise<void>;
  /** Deja la herramienta en blanco, como recien abierta. */
  reset(): void;
  /** Lo que se dice de cada trabajo bajo su titulo, ademas de la fecha. */
  describe?(data: T): string;
  /** Mientras la herramienta esta ocupada no se cambia de trabajo. */
  isBusy?(): boolean;
  /** Para avisar de un fallo: sin sitio, una base que no abre… */
  onError?(message: string): void;
}

export interface History {
  /** Guarda dentro de un momento. Se llama en cada cambio, sin miedo. */
  schedule(): void;
  /** Guarda ya, sin esperar. */
  save(): Promise<void>;
  /** Empieza un trabajo en blanco; el que habia se queda en la lista. */
  fresh(): Promise<void>;
  /** Abre la base, vuelve al trabajo de la pestaña si lo hay y pinta la lista. */
  start(): Promise<void>;
  /** True mientras se esta montando un trabajo guardado. */
  restoring(): boolean;
}

/** Cuantos trabajos se conservan por herramienta. */
export const MAX_WORKS = 10;

/** Lo que tarda en guardarse un cambio: lo justo para no escribir a cada letra. */
const SAVE_DELAY = 900;

const DB_VERSION = 1;
const WORKS = "works";
const FILES = "files";

/** La ficha tal como queda en la base. */
interface Entry<T> {
  id: string;
  updated: number;
  title: string;
  thumb: string;
  /**
   * Los datos de la herramienta. Los primeros hilos se guardaron con los datos
   * sueltos en la propia ficha, de cuando esto era solo del Hilo Generator; a
   * esos se les leen desde la ficha entera.
   */
  data?: T;
}

/**
 * La miniatura de un lienzo para la lista, como `data:`. A 216 de ancho, que
 * es el doble de lo que ocupa en pantalla, y en JPEG: en PNG una foto pesaria
 * diez veces mas y la lista entera se guarda en cada ficha.
 */
export function thumbnail(canvas: HTMLCanvasElement, width = 216): string {
  const t = document.createElement("canvas");
  t.width = width;
  t.height = Math.max(1, Math.round((canvas.height * width) / Math.max(1, canvas.width)));
  t.getContext("2d")?.drawImage(canvas, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.75);
}

/** El id de un archivo o de un trabajo. */
export function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function request<R>(req: IDBRequest<R>): Promise<R> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB falló"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB falló"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB canceló la escritura"));
  });
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const base = req.result;
      if (!base.objectStoreNames.contains(WORKS)) base.createObjectStore(WORKS, { keyPath: "id" });
      if (!base.objectStoreNames.contains(FILES)) base.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir IndexedDB"));
  });
}

/** Todos los `fileId` que cita una ficha, esten donde esten dentro de ella. */
function fileIds(value: unknown, out: Set<string>): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) fileIds(v, out);
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (key === "fileId" && typeof v === "string") out.add(v);
      else fileIds(v, out);
    }
  }
  return out;
}

function session(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Sin sessionStorage no se vuelve solo al trabajo, pero sigue en la lista.
  }
  return null;
}

export function historial<T>(cfg: HistoryConfig<T>): History {
  const sessionKey = `${cfg.tool}:abierto`;
  let db: IDBDatabase | null = null;
  /** Mientras se monta un trabajo guardado, lo que se pinta no es un cambio. */
  let restoring = false;
  /** El id con el que se guarda el trabajo abierto. null hasta el primer guardado. */
  let workId: string | null = null;
  /** Lo ultimo que se guardo, para no reescribir lo que no ha cambiado. */
  let lastSaved = "";
  /** Archivos que ya estan en la base: se escriben una vez y no mas. */
  const stored = new Set<string>();
  let timer = 0;
  /** Las escrituras van en fila: un guardado y un borrado no se pisan. */
  let queue: Promise<void> = Promise.resolve();
  let warned = false;

  // --- La seccion -------------------------------------------------------------

  const head = document.createElement("div");
  head.className = "history-head";
  const h2 = document.createElement("h2");
  h2.textContent = cfg.heading;
  const freshBtn = document.createElement("button");
  freshBtn.type = "button";
  freshBtn.className = "btn-secondary";
  freshBtn.textContent = cfg.freshLabel;
  head.append(h2, freshBtn);
  const hint = document.createElement("p");
  hint.className = "muted small history-hint";
  hint.textContent =
    `Se guardan solos mientras trabajas, en este navegador y solo en él: no salen de ` +
    `tu equipo. Se conservan los ${MAX_WORKS} más recientes.`;
  const list = document.createElement("div");
  list.className = "works";
  cfg.host.classList.add("history");
  cfg.host.hidden = true;
  cfg.host.replaceChildren(head, hint, list);

  // --- La base ----------------------------------------------------------------

  async function all(): Promise<Entry<T>[]> {
    if (!db) return [];
    const tx = db.transaction(WORKS, "readonly");
    const works = await request<Entry<T>[]>(tx.objectStore(WORKS).getAll());
    return works.sort((a, b) => b.updated - a.updated);
  }

  async function getFile(id: string): Promise<File | null> {
    if (!db) return null;
    const tx = db.transaction(FILES, "readonly");
    const file = await request<unknown>(tx.objectStore(FILES).get(id));
    if (!(file instanceof File)) return null;
    stored.add(id);
    return file;
  }

  /**
   * Borra las fichas que se digan y, detras, los archivos que ya no cite
   * ninguna. Los archivos se comparten por id, asi que no se pueden borrar con
   * su ficha sin mirar antes si otra los sigue usando.
   */
  async function remove(ids: string[]): Promise<void> {
    if (!db) return;
    if (ids.length > 0) {
      const tx = db.transaction(WORKS, "readwrite");
      for (const id of ids) tx.objectStore(WORKS).delete(id);
      await done(tx);
    }
    const used = fileIds(await all(), new Set());
    const tx = db.transaction(FILES, "readwrite");
    const store = tx.objectStore(FILES);
    for (const key of await request(store.getAllKeys())) {
      if (typeof key === "string" && !used.has(key)) {
        store.delete(key);
        stored.delete(key);
      }
    }
    await done(tx);
  }

  function enqueue(job: () => Promise<void>): Promise<void> {
    queue = queue.then(job).catch((err: unknown) => {
      console.error(err);
      if (warned) return;
      warned = true;
      cfg.onError?.(
        "No se pudo guardar en el historial: puede que el navegador se haya quedado sin sitio.",
      );
    });
    return queue;
  }

  // --- Guardar ----------------------------------------------------------------

  function save(): Promise<void> {
    clearTimeout(timer);
    if (!db || restoring) return queue;
    return enqueue(async () => {
      if (!db) return;
      const snap = cfg.snapshot();
      if (snap.empty) return;
      const json = JSON.stringify(snap.data);
      if (json === lastSaved) return;

      for (const { id, file } of snap.files) {
        if (stored.has(id)) continue;
        const tx = db.transaction(FILES, "readwrite");
        tx.objectStore(FILES).put(file, id);
        await done(tx);
        stored.add(id);
      }

      workId ??= newId();
      session(sessionKey, workId);
      const record: Entry<T> = {
        id: workId,
        updated: Date.now(),
        title: snap.title,
        thumb: snap.thumb,
        data: snap.data,
      };
      const tx = db.transaction(WORKS, "readwrite");
      tx.objectStore(WORKS).put(record);
      await done(tx);
      lastSaved = json;

      // El tope: lo que pase de los diez ultimos se va, con sus archivos.
      await remove((await all()).slice(MAX_WORKS).map((w) => w.id));
      await render();
    });
  }

  function schedule(): void {
    if (!db || restoring) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => void save(), SAVE_DELAY);
  }

  // Al irse de la pagina —atras, cerrar, cambiar de pestaña— se guarda ya, sin
  // esperar al retardo: es justo el momento en que se perderia lo ultimo.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void save();
  });
  window.addEventListener("pagehide", () => void save());

  // --- Abrir y empezar de cero ------------------------------------------------

  async function open(record: Entry<T>): Promise<void> {
    if (cfg.isBusy?.()) return;
    // Lo que hay abierto se guarda antes de cambiarlo por otro.
    await save();
    restoring = true;
    try {
      await cfg.restore(record.data ?? (record as unknown as T), getFile);
      workId = record.id;
      session(sessionKey, record.id);
      // Lo abierto es lo guardado: abrir uno viejo no lo sube arriba de la
      // lista hasta que de verdad se toque algo.
      lastSaved = JSON.stringify(cfg.snapshot().data);
    } catch (err) {
      console.error(err);
      cfg.onError?.("No se pudo abrir ese trabajo del historial.");
    } finally {
      restoring = false;
    }
    await render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fresh(): Promise<void> {
    if (cfg.isBusy?.()) return;
    // El que habia se queda en la lista tal como estaba.
    await save();
    restoring = true;
    try {
      cfg.reset();
    } finally {
      restoring = false;
    }
    workId = null;
    lastSaved = "";
    session(sessionKey, null);
    await render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  freshBtn.addEventListener("click", () => void fresh());

  // --- La lista ---------------------------------------------------------------

  async function render(): Promise<void> {
    if (!db) return;
    const works = await all();
    cfg.host.hidden = works.length === 0;

    const cards = works.map((w) => {
      const current = w.id === workId;
      const card = document.createElement("div");
      card.className = current ? "work is-current" : "work";

      const go = document.createElement("button");
      go.type = "button";
      go.className = "work-open";
      go.disabled = current;
      const img = document.createElement("img");
      img.src = w.thumb;
      img.alt = "";
      const title = document.createElement("strong");
      title.textContent = w.title;
      const meta = document.createElement("span");
      meta.className = "muted small";
      const when = new Date(w.updated).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const what = cfg.describe?.(w.data ?? (w as unknown as T)) ?? "";
      meta.textContent = what ? `${what} · ${when}` : when;
      go.append(img, title, meta);
      go.addEventListener("click", () => void open(w));

      const side = document.createElement(current ? "span" : "button");
      side.className = current ? "work-now small" : "btn-secondary work-delete";
      side.textContent = current ? "Abierto ahora" : "Borrar";
      if (side instanceof HTMLButtonElement) {
        side.type = "button";
        side.addEventListener("click", () => {
          void enqueue(async () => {
            await remove([w.id]);
            await render();
          });
        });
      }

      card.append(go, side);
      return card;
    });
    list.replaceChildren(...cards);
  }

  async function start(): Promise<void> {
    try {
      db = await openDb(cfg.tool);
    } catch {
      // Algunas ventanas privadas no dejan: sin historial, pero con herramienta.
      db = null;
      return;
    }
    // Volver atras o recargar es seguir donde se estaba: la pestaña recuerda
    // que trabajo tenia abierto. Una visita nueva empieza en blanco, con la
    // lista debajo para recuperar cualquiera de los anteriores.
    const id = session(sessionKey);
    const mine = id ? (await all()).find((w) => w.id === id) : undefined;
    if (mine && cfg.snapshot().empty) await open(mine);
    else await render();
    schedule();
  }

  return { schedule, save, fresh, start, restoring: () => restoring };
}
