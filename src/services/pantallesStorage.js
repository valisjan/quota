import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { E2E_AUTH_BYPASS, E2E_CURS_ID } from './e2e';

export const DEFAULT_SCREEN_ID = 'sala-professorat';
const E2E_SCREEN_PREFIX = 'quota-e2e-pantalla:';
const E2E_GUARDIES_PREFIX = 'quota-e2e-guardies:';

export const DEFAULT_SCREEN_CONFIG = Object.freeze({
  schemaVersion: 1,
  name: 'Sala de professorat',
  active: true,
  courseId: '2026-2027',
  dateMode: 'today',
  selectedDate: '',
  theme: 'light',
  scale: 100,
  modules: ['guardies', 'pati', 'sortides'],
  message: '',
});

function screenRef(screenId) {
  return doc(db, 'pantalles', String(screenId || DEFAULT_SCREEN_ID));
}

function publicDayRef(courseId, date) {
  return doc(db, 'cursos', courseId, 'guardiesPublicDays', date);
}

export function normalizeScreenConfig(data = {}) {
  const modules = Array.from(new Set(Array.isArray(data.modules) ? data.modules : DEFAULT_SCREEN_CONFIG.modules))
    .filter((item) => ['guardies', 'pati', 'sortides'].includes(item));
  return {
    ...DEFAULT_SCREEN_CONFIG,
    ...data,
    active: data.active !== false,
    dateMode: ['today', 'tomorrow', 'specific'].includes(data.dateMode) ? data.dateMode : 'today',
    theme: ['light', 'dark'].includes(data.theme) ? data.theme : 'light',
    scale: Math.min(140, Math.max(80, Math.round(Number(data.scale) || 100))),
    modules: modules.length ? modules : [...DEFAULT_SCREEN_CONFIG.modules],
    message: String(data.message || '').trim().slice(0, 240),
  };
}

export function subscribeScreenConfig(screenId, onChange, onError = () => {}) {
  if (E2E_AUTH_BYPASS) {
    const key = `${E2E_SCREEN_PREFIX}${screenId}`;
    const emit = () => {
      try {
        const raw = localStorage.getItem(key);
        onChange(normalizeScreenConfig(raw ? JSON.parse(raw) : { courseId: E2E_CURS_ID }), Boolean(raw));
      } catch (error) {
        onError(error);
      }
    };
    emit();
    const listener = (event) => { if (event.key === key) emit(); };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  return onSnapshot(screenRef(screenId), (snapshot) => {
    onChange(normalizeScreenConfig(snapshot.exists() ? snapshot.data() : {}), snapshot.exists());
  }, onError);
}

export function subscribePublicGuardiesDay(courseId, date, onChange, onError = () => {}) {
  if (!courseId || !date) return () => {};
  if (E2E_AUTH_BYPASS) {
    const key = `${E2E_GUARDIES_PREFIX}${courseId}`;
    const emit = () => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        onChange(data.publicDays?.[date] || null);
      } catch (error) {
        onError(error);
      }
    };
    emit();
    const listener = (event) => { if (event.key === key) emit(); };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  return onSnapshot(publicDayRef(courseId, date), (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : null;
    onChange(data && ['published', 'closed'].includes(data.status) ? data : null);
  }, onError);
}

export async function saveScreenConfig(screenId, config) {
  const clean = normalizeScreenConfig(config);
  if (E2E_AUTH_BYPASS) {
    localStorage.setItem(`${E2E_SCREEN_PREFIX}${screenId}`, JSON.stringify(clean));
    return clean;
  }
  await setDoc(screenRef(screenId), {
    ...clean,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return clean;
}

export async function savePublicGuardiesDay(courseId, date, projection) {
  if (E2E_AUTH_BYPASS) {
    const key = `${E2E_GUARDIES_PREFIX}${courseId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.publicDays ||= {};
    if (projection && ['published', 'closed'].includes(projection.status)) data.publicDays[date] = projection;
    else delete data.publicDays[date];
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }
  const reference = publicDayRef(courseId, date);
  if (!projection || !['published', 'closed'].includes(projection.status)) {
    await deleteDoc(reference).catch((error) => {
      if (error?.code !== 'not-found') throw error;
    });
    return;
  }
  await setDoc(reference, {
    ...projection,
    schemaVersion: 1,
    courseId,
    date,
    updatedAt: serverTimestamp(),
  });
}

export function waitForPantallesUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function isPantallesAdmin() {
  if (E2E_AUTH_BYPASS) return true;
  const user = await waitForPantallesUser();
  if (!user) return false;
  const snapshot = await getDoc(doc(db, 'usuaris', user.uid));
  return snapshot.exists() && snapshot.data()?.rol === 'admin';
}
