/**
 * Capa de datos. Usa Firestore si está configurado; si no, guarda en
 * localStorage para poder probar la app sin backend.
 *
 * Estructura en Firestore:  hogares/stephania-santiago/<coleccion>/<doc>
 */
import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, writeBatch,
} from 'firebase/firestore';
import { db, firebaseConfigured } from './firebase';

export const HOGAR = 'stephania-santiago';
export const COLECCIONES = ['salarios', 'ingresos', 'gastos', 'gastosFijos', 'metas', 'deudas', 'casaItems', 'config'];

const colRef = (name) => collection(db, 'hogares', HOGAR, name);
const docRef = (name, id) => doc(db, 'hogares', HOGAR, name, id);

/* ---------- fallback local ---------- */
const LS_KEY = (name) => `stegobook:${name}`;
const listeners = new Map();
const readLocal = (name) => {
  try { return JSON.parse(localStorage.getItem(LS_KEY(name))) || []; } catch { return []; }
};
const writeLocal = (name, items) => {
  localStorage.setItem(LS_KEY(name), JSON.stringify(items));
  (listeners.get(name) || []).forEach((cb) => cb(items));
};
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clean = (data) => JSON.parse(JSON.stringify(data)); // quita undefined

/* ---------- API ---------- */
export function subscribe(name, cb) {
  if (firebaseConfigured) {
    return onSnapshot(
      colRef(name),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error(`Error leyendo ${name}`, err); cb([], err); },
    );
  }
  const arr = listeners.get(name) || [];
  arr.push(cb);
  listeners.set(name, arr);
  cb(readLocal(name));
  return () => listeners.set(name, (listeners.get(name) || []).filter((f) => f !== cb));
}

export async function add(name, data) {
  const payload = clean({ ...data, creado: new Date().toISOString() });
  if (firebaseConfigured) return (await addDoc(colRef(name), payload)).id;
  const id = uid();
  writeLocal(name, [...readLocal(name), { id, ...payload }]);
  return id;
}

export async function update(name, id, data) {
  const payload = clean(data);
  if (firebaseConfigured) return updateDoc(docRef(name, id), payload);
  writeLocal(name, readLocal(name).map((it) => (it.id === id ? { ...it, ...payload } : it)));
}

export async function set(name, id, data) {
  const payload = clean(data);
  if (firebaseConfigured) return setDoc(docRef(name, id), payload, { merge: true });
  const items = readLocal(name);
  const exists = items.some((it) => it.id === id);
  writeLocal(name, exists
    ? items.map((it) => (it.id === id ? { ...it, ...payload } : it))
    : [...items, { id, ...payload }]);
}

export async function remove(name, id) {
  if (firebaseConfigured) return deleteDoc(docRef(name, id));
  writeLocal(name, readLocal(name).filter((it) => it.id !== id));
}

/** Reemplaza el contenido completo (para importar copias de seguridad). */
export async function importAll(backup) {
  for (const name of COLECCIONES) {
    const items = backup[name];
    if (!Array.isArray(items)) continue;
    if (firebaseConfigured) {
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach(({ id, ...rest }) => batch.set(docRef(name, id || uid()), clean(rest)));
        await batch.commit();
      }
    } else {
      writeLocal(name, items.map((it) => ({ id: it.id || uid(), ...it })));
    }
  }
}

/* ---------- hooks ---------- */
export function useCollection(name) {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  useEffect(() => subscribe(name, (items, error) => setState({ items, loading: false, error: error || null })), [name]);
  return state;
}

/** Borra varios documentos de una colección. */
export async function removeMany(name, ids) {
  if (!ids.length) return;
  if (firebaseConfigured) {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(docRef(name, id)));
      await batch.commit();
    }
  } else {
    const set_ = new Set(ids);
    writeLocal(name, readLocal(name).filter((it) => !set_.has(it.id)));
  }
}
