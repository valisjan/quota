import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { E2E_AUTH_BYPASS } from './e2e';

export const DEFAULT_APP_SETTINGS = {
  totalGuardiesPati: 30,
  gpExclusions: null,  // null = usar exclusions hardcoded; [] o array = configuració admin
  gpReductions: {},    // { 'Departament': N } — membres efectius menys N
};

const noop = () => {};
const settingsRef = (cursId) => doc(db, 'cursos', cursId, 'config', 'app_settings');

export function subscribeAppSettings(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) {
    callback({ ...DEFAULT_APP_SETTINGS });
    return noop;
  }
  if (!cursId) {
    callback({ ...DEFAULT_APP_SETTINGS });
    return noop;
  }
  return onSnapshot(
    settingsRef(cursId),
    (snapshot) => {
      callback({
        ...DEFAULT_APP_SETTINGS,
        ...(snapshot.exists() ? snapshot.data() : {}),
      });
    },
    onError
  );
}

export async function llegirAppSettings(cursId) {
  if (E2E_AUTH_BYPASS || !cursId) return { ...DEFAULT_APP_SETTINGS };
  const snapshot = await getDoc(settingsRef(cursId));
  return { ...DEFAULT_APP_SETTINGS, ...(snapshot.exists() ? snapshot.data() : {}) };
}

export async function updateAppSettings(cursId, settings) {
  if (E2E_AUTH_BYPASS) return;
  if (!cursId) throw new Error('No hi ha cap curs actiu.');
  await setDoc(
    settingsRef(cursId),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
