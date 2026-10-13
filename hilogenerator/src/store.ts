/**
 * El historial: los ultimos hilos, guardados en el propio navegador.
 *
 * Va en IndexedDB y no en `localStorage` porque un hilo lleva sus imagenes y
 * sus videos, y `localStorage` solo guarda texto y se llena con cinco megas.
 * Nada de esto sale del equipo: es la misma promesa que el resto del taller.
 *
 * Hay dos almacenes. `works` tiene los hilos —textos, medidas, encuadres— y es
 * pequeño; `files` tiene los archivos, cada uno una sola vez. Estan separados
 * porque el hilo se vuelve a guardar a cada cambio, y reescribir un video de
 * cien megas por cada letra que se teclea no es una opcion: asi el archivo se
 * escribe al cargarlo y lo que se repite es solo la ficha.
 */
import type { Kind } from "./format.js";

const DB_NAME = "hilogenerator";
const DB_VERSION = 1;
const WORKS = "works";
const FILES = "files";

export interface SavedTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface SavedSlide {
  kind: Kind;
  text: string;
  size: number;
  topOn: boolean;
  topText: string;
  topSize: number;
  marginBottom: number;
  marginTop: number;
  marginSide: number;
  bandPad: number;
  bigScale: number;
  arrow: boolean;
  active: number;
  trim: { start: number; end: number };
  items: { fileId: string; transform: SavedTransform; flip: boolean }[];
  inset: {
    on: boolean;
    fileId: string | null;
    cx: number;
    cy: number;
    radius: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
}

/** Lo que define un hilo, sin lo que solo sirve para listarlo. */
export interface WorkData {
  colorText: string;
  colorHighlight: string;
  slides: SavedSlide[];
}

export interface Work extends WorkData {
  id: string;
  /** Cuando se guardo por ultima vez, en milisegundos. Ordena el historial. */
  updated: number;
  /** El primer texto del hilo, para reconocerlo en la lista. */
  title: string;
  /** La miniatura de la primera pieza, como `data:` para no depender de nada. */
  thumb: string;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
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

let opening: Promise<IDBDatabase> | null = null;

/**
 * Abre la base, una sola vez. Lanza si el navegador no deja —pasa en algunas
 * ventanas privadas—, y entonces quien llama se queda sin historial pero con
 * la herramienta entera.
 */
function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const base = req.result;
      if (!base.objectStoreNames.contains(WORKS)) base.createObjectStore(WORKS, { keyPath: "id" });
      if (!base.objectStoreNames.contains(FILES)) base.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir IndexedDB"));
  });
  return opening;
}

/** True si aqui se puede guardar. Se pregunta una vez, al arrancar. */
export async function available(): Promise<boolean> {
  try {
    await db();
    return true;
  } catch {
    return false;
  }
}

export async function putFile(id: string, file: File): Promise<void> {
  const tx = (await db()).transaction(FILES, "readwrite");
  tx.objectStore(FILES).put(file, id);
  await done(tx);
}

export async function getFile(id: string): Promise<File | null> {
  const tx = (await db()).transaction(FILES, "readonly");
  const file = await request<unknown>(tx.objectStore(FILES).get(id));
  return file instanceof File ? file : null;
}

export async function putWork(work: Work): Promise<void> {
  const tx = (await db()).transaction(WORKS, "readwrite");
  tx.objectStore(WORKS).put(work);
  await done(tx);
}

/** Todos los hilos guardados, del mas reciente al mas antiguo. */
export async function listWorks(): Promise<Work[]> {
  const tx = (await db()).transaction(WORKS, "readonly");
  const works = await request<Work[]>(tx.objectStore(WORKS).getAll());
  return works.sort((a, b) => b.updated - a.updated);
}

function fileIds(work: Work): string[] {
  const ids: string[] = [];
  for (const s of work.slides) {
    for (const it of s.items) ids.push(it.fileId);
    if (s.inset.fileId) ids.push(s.inset.fileId);
  }
  return ids;
}

/**
 * Borra los hilos que se digan y, detras, los archivos que ya no use ninguno.
 * Los archivos se comparten por id, asi que no se pueden borrar con su hilo
 * sin mirar antes si otro los sigue usando.
 */
export async function deleteWorks(ids: string[]): Promise<void> {
  const base = await db();
  if (ids.length > 0) {
    const tx = base.transaction(WORKS, "readwrite");
    for (const id of ids) tx.objectStore(WORKS).delete(id);
    await done(tx);
  }

  const used = new Set((await listWorks()).flatMap(fileIds));
  const tx = base.transaction(FILES, "readwrite");
  const store = tx.objectStore(FILES);
  for (const key of await request(store.getAllKeys())) {
    if (typeof key === "string" && !used.has(key)) store.delete(key);
  }
  await done(tx);
}

/**
 * Deja solo los `max` mas recientes. Se llama despues de cada guardado, asi
 * que el historial nunca crece sin tope aunque nadie lo limpie a mano.
 */
export async function prune(max: number): Promise<void> {
  const old = (await listWorks()).slice(max).map((w) => w.id);
  await deleteWorks(old);
}
