// Escriptures del panell Quota: les classes de cada departament es creen, s'editen i
// s'esborren aquí. Els documents de classe
// conserven l'id, de manera que les assignacions del repartiment no es perden.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BatchSplit } from '../utils/firestoreBatch';
import { classePerCopiar, novaClasse } from '../utils/quota';
import { parseGestibXml } from './gestibMapper';
import { carregarXmlGestibRemot, desarXmlGestibRemot } from './gestibXmlStorage';
import { E2E_AUTH_BYPASS, getE2ECollection } from './e2e';

const classesRef = (cursId) => collection(db, 'cursos', cursId, 'classes');
const departamentsRef = (cursId) => collection(db, 'cursos', cursId, 'departaments');
const ambId = (d) => ({ id: d.id, ...d.data() });
const ara = () => new Date();

// ---------------------------------------------------------------------------
// Mode de prova (E2E): tot en memòria.

let memoria = null;
const oients = new Set();
let comptadorE2E = 0;

function memoriaE2E() {
  if (!memoria) {
    memoria = {
      classes: getE2ECollection('classes'),
      departaments: getE2ECollection('departaments'),
    };
  }
  return memoria;
}

function notificaE2E() {
  oients.forEach((oient) => oient());
}

function subscriuE2E(llegir, callback) {
  const oient = () => callback(llegir(memoriaE2E()));
  oients.add(oient);
  oient();
  return () => oients.delete(oient);
}

// ---------------------------------------------------------------------------
// Lectura en temps real.

export function subscriureClasses(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) return subscriuE2E((estat) => estat.classes.map((classe) => ({ ...classe })), callback);
  if (!cursId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(classesRef(cursId), (snap) => callback(snap.docs.map(ambId)), onError);
}

export function subscriureDepartaments(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) return subscriuE2E((estat) => estat.departaments.map((dep) => ({ ...dep })), callback);
  if (!cursId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(departamentsRef(cursId), (snap) => callback(snap.docs.map(ambId)), onError);
}

// ---------------------------------------------------------------------------
// Escriptures.

const metadades = (actor) => ({ updatedAt: ara(), quotaPer: actor || 'admin' });

// files: camps de cada fila; opcionalment amb «gestib» (la correspondència amb GestIB).
export async function crearClasses({ cursId, departament, files, actor }) {
  if (!files.length) return { creades: 0 };
  const nova = ({ gestib, ...camps }) => ({ ...novaClasse(camps, departament), ...(gestib ? { gestib } : {}) });
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    files.forEach((camps) => {
      comptadorE2E += 1;
      estat.classes.push({ id: `e2e-quota-${comptadorE2E}`, ...nova(camps) });
    });
    notificaE2E();
    return { creades: files.length };
  }
  if (files.length === 1) {
    await addDoc(classesRef(cursId), { ...nova(files[0]), ...metadades(actor) });
    return { creades: 1 };
  }
  const batch = new BatchSplit();
  files.forEach((camps) => batch.set(doc(classesRef(cursId)), { ...nova(camps), ...metadades(actor) }));
  await batch.commit();
  return { creades: files.length };
}

export async function actualitzarClasse({ cursId, id, canvis, actor }) {
  if (!Object.keys(canvis).length) return;
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    const index = estat.classes.findIndex((classe) => classe.id === id);
    if (index >= 0) estat.classes[index] = { ...estat.classes[index], ...canvis };
    notificaE2E();
    return;
  }
  await updateDoc(doc(classesRef(cursId), id), { ...canvis, ...metadades(actor) });
}

export async function esborrarClasse({ cursId, id }) {
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    estat.classes = estat.classes.filter((classe) => classe.id !== id);
    notificaE2E();
    return;
  }
  await deleteDoc(doc(classesRef(cursId), id));
}

// Correspondències amb GestIB: [{ id, gestib }] (gestib null la treu).
export async function desarCorrespondencies({ cursId, enllacos, actor }) {
  if (!enllacos.length) return { desades: 0 };
  if (E2E_AUTH_BYPASS) {
    const estat = memoriaE2E();
    enllacos.forEach(({ id, gestib }) => {
      const index = estat.classes.findIndex((classe) => classe.id === id);
      if (index < 0) return;
      const { gestib: _anterior, ...resta } = estat.classes[index];
      estat.classes[index] = gestib ? { ...resta, gestib } : resta;
    });
    notificaE2E();
    return { desades: enllacos.length };
  }
  const batch = new BatchSplit();
  enllacos.forEach(({ id, gestib }) => batch.update(doc(classesRef(cursId), id), { gestib: gestib || null, ...metadades(actor) }));
  await batch.commit();
  return { desades: enllacos.length };
}

// Catàleg de GestIB del curs (l'exportacioDadesHoraris): el mateix XML que fa servir Untis.
export async function carregarCatalegGestib(cursId) {
  const desat = await carregarXmlGestibRemot(cursId);
  if (!desat?.text) return null;
  return { info: desat, cataleg: parseGestibXml(desat.text) };
}

export async function desarCatalegGestib(cursId, { text, nom }) {
  await desarXmlGestibRemot(cursId, { text, nom });
  return carregarCatalegGestib(cursId);
}

// Correspondències manuals que es feien a la pàgina Untis (per proposar-les a les files).
export async function llegirMapeigAntic(cursId) {
  if (E2E_AUTH_BYPASS || !cursId) return null;
  const snap = await getDoc(doc(db, 'cursos', cursId, 'config', 'untis_mapeig'));
  return snap.exists() ? snap.data().overrides || null : null;
}

// «Desfés» d'un esborrat: la classe torna amb el mateix id i el professorat que tenia.
export async function restaurarClasse({ cursId, classe }) {
  const { id, ...dades } = classe;
  if (E2E_AUTH_BYPASS) {
    memoriaE2E().classes.push({ ...classe });
    notificaE2E();
    return;
  }
  await setDoc(doc(classesRef(cursId), id), dades);
}

// La quota d'un altre curs com a punt de partida (sense el repartiment del professorat).
export async function copiarQuotaDeCurs({ origen, desti, actor }) {
  if (E2E_AUTH_BYPASS) return { copiades: 0 };
  const [deOrigen, aDesti] = await Promise.all([getDocs(classesRef(origen)), getDocs(classesRef(desti))]);
  if (!aDesti.empty) throw new Error('El curs de destinació ja té classes.');
  const batch = new BatchSplit();
  deOrigen.docs.forEach((d) => {
    batch.set(doc(classesRef(desti)), { ...classePerCopiar(d.data()), ...metadades(actor) });
  });
  await batch.commit();
  return { copiades: deOrigen.size };
}
