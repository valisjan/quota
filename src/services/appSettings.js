import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_APP_SETTINGS = {
  tancamentAdmin: false,
  departamentsTancats: {},
  missatgeTancament: '',
  totalGuardiesPati: 30,
};

const noop = () => {};
const settingsRef = (cursId) => doc(db, 'cursos', cursId, 'config', 'app_settings');

export function subscribeAppSettings(cursId, callback, onError = console.error) {
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

export async function updateAppSettings(cursId, settings) {
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
