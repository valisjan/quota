import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_APP_SETTINGS = {
  tancamentAdmin: false,
  departamentsTancats: {},
  missatgeTancament: '',
};

const settingsRef = () => doc(db, 'config', 'app_settings');

export function subscribeAppSettings(callback, onError = console.error) {
  return onSnapshot(
    settingsRef(),
    (snapshot) => {
      callback({
        ...DEFAULT_APP_SETTINGS,
        ...(snapshot.exists() ? snapshot.data() : {}),
      });
    },
    onError
  );
}

export async function updateAppSettings(settings) {
  await setDoc(
    settingsRef(),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
