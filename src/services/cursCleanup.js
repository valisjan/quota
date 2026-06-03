import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const MAX_OPERACIONS_BATCH = 450;

export const SUBCOLLECCIONS_CURS = [
  'classes',
  'professors',
  'departaments',
  'sync_history',
  'presence',
  'config',
];

class BatchDelete {
  constructor() {
    this.batch = writeBatch(db);
    this.operacions = 0;
  }

  async delete(ref) {
    if (this.operacions >= MAX_OPERACIONS_BATCH) {
      await this.commit();
    }
    this.batch.delete(ref);
    this.operacions += 1;
  }

  async commit() {
    if (!this.operacions) return;
    await this.batch.commit();
    this.batch = writeBatch(db);
    this.operacions = 0;
  }
}

async function eliminarCampMapeigLegacy(cursId) {
  const ref = doc(db, 'config', 'untis_mapeig');
  const snap = await getDoc(ref);
  if (!snap.exists() || !Object.prototype.hasOwnProperty.call(snap.data(), cursId)) {
    return 0;
  }
  await updateDoc(ref, { [cursId]: deleteField() });
  return 1;
}

export async function eliminarCursAcademicComplet(cursId, options = {}) {
  if (!cursId) throw new Error('No hi ha cap curs seleccionat.');

  const batch = new BatchDelete();
  const eliminarPreautoritzats = options.eliminarPreautoritzats === true;
  const emailsPreautoritzats = new Set();
  const eliminats = {
    classes: 0,
    professors: 0,
    departaments: 0,
    sync_history: 0,
    presence: 0,
    config: 0,
    preautoritzats: 0,
    legacyConfig: 0,
    curs: 0,
  };

  for (const nom of SUBCOLLECCIONS_CURS) {
    const snap = await getDocs(collection(db, 'cursos', cursId, nom));
    for (const document of snap.docs) {
      if (eliminarPreautoritzats && nom === 'professors') {
        const email = (document.data().email || '').toString().trim();
        if (email) emailsPreautoritzats.add(email);
      }
      await batch.delete(document.ref);
      eliminats[nom] += 1;
    }
  }

  for (const email of emailsPreautoritzats) {
    await batch.delete(doc(db, 'preautoritzats', email));
    eliminats.preautoritzats += 1;
  }

  await batch.delete(doc(db, 'cursos', cursId));
  eliminats.curs = 1;
  await batch.commit();

  eliminats.legacyConfig = await eliminarCampMapeigLegacy(cursId);
  eliminats.total =
    eliminats.classes +
    eliminats.professors +
    eliminats.departaments +
    eliminats.sync_history +
    eliminats.presence +
    eliminats.config +
    eliminats.preautoritzats +
    eliminats.legacyConfig +
    eliminats.curs;

  return eliminats;
}
