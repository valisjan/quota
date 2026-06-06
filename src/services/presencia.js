import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { E2E_AUTH_BYPASS } from './e2e';

const SESSION_KEY = 'quota_presence_session_id';
const HEARTBEAT_MS = 20 * 1000;
const ACTIVE_WINDOW_MS = 75 * 1000;

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function safeId(value) {
  return (value || 'user').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
}

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalitzarEntrada(id, data, now = Date.now()) {
  const lastSeen = millis(data.lastSeen) || millis(data.timestamp) || millis(data.updatedAt);
  if (!lastSeen || now - lastSeen > ACTIVE_WINDOW_MS) return null;

  return {
    id,
    uid: data.uid || '',
    sessionId: data.sessionId || '',
    usuari: data.usuari || data.email || data.rol || 'Usuari',
    email: data.email || '',
    photoURL: data.photoURL || '',
    rol: data.rol || '',
    departament: data.departament || '',
    path: data.path || '',
    area: data.area || '',
    scope: data.scope || '',
    lastSeen,
  };
}

function softKey(entrada) {
  return [
    (entrada.usuari || '').toLowerCase(),
    (entrada.email || '').toLowerCase(),
    entrada.rol || '',
    entrada.departament || '',
  ].join('|');
}

export function etiquetaRolPresencia(rol) {
  const etiquetes = {
    admin: 'Admin',
    cap_departament: 'Cap de departament',
    departament: 'Cap de departament',
    professor: 'Professor',
  };
  return etiquetes[rol] || rol || '';
}

export function etiquetaAreaPresencia(path = '') {
  if (path.startsWith('/admin')) return 'Administració';
  if (path.startsWith('/departament')) return 'Departament';
  if (path.startsWith('/resums')) return 'Resums';
  if (path === '/') return 'Inici';
  return '';
}

export function subscribePresencia(cursId, callback, onError = console.error) {
  if (E2E_AUTH_BYPASS) {
    callback([
      {
        id: 'e2e-admin',
        uid: 'e2e-admin',
        sessionId: 'e2e',
        usuari: 'E2E Admin',
        email: 'e2e.admin@iesjosepsuredaiblanes.com',
        photoURL: '',
        rol: 'admin',
        departament: 'Catala',
        path: '/admin/dades',
        area: 'Administracio',
        scope: 'app',
        lastSeen: Date.now(),
      },
    ]);
    return () => {};
  }
  if (!cursId) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'cursos', cursId, 'presence')),
    (snapshot) => {
      const now = Date.now();
      const entrades = snapshot.docs
        .map((d) => normalitzarEntrada(d.id, d.data(), now))
        .filter(Boolean)
        .sort((a, b) => b.lastSeen - a.lastSeen);

      const byKey = new Map();
      const bySoftKey = new Map();

      for (const entrada of entrades) {
        const strongKey = entrada.uid || entrada.email;
        const soft = softKey(entrada);

        if (strongKey) {
          const existingSoft = bySoftKey.get(soft);
          if (existingSoft && existingSoft !== strongKey) {
            const existing = byKey.get(existingSoft);
            if (existing && !existing.uid && !existing.email) {
              byKey.delete(existingSoft);
            }
          }
          if (!byKey.has(strongKey)) byKey.set(strongKey, entrada);
          bySoftKey.set(soft, strongKey);
        } else if (!bySoftKey.has(soft)) {
          byKey.set(soft, entrada);
          bySoftKey.set(soft, soft);
        }
      }

      callback(
        [...byKey.values()].sort((a, b) =>
          (a.usuari || '').localeCompare(b.usuari || '', 'ca')
        )
      );
    },
    onError
  );
}

export function iniciarPresenciaGlobal({ cursId, user, getPath }) {
  if (E2E_AUTH_BYPASS) return () => {};
  if (!cursId || !user?.uid) return () => {};

  const currentSessionId = sessionId();
  const presenceRef = doc(
    db,
    'cursos',
    cursId,
    'presence',
    `global_${safeId(user.uid)}_${safeId(currentSessionId)}`
  );

  let interval = null;
  let stopped = false;

  const writePresence = () => {
    if (stopped) return;
    const path = typeof getPath === 'function' ? getPath() : '';
    setDoc(
      presenceRef,
      {
        scope: 'app',
        uid: user.uid,
        sessionId: currentSessionId,
        usuari: user.usuari || user.email || 'Usuari',
        email: user.email || '',
        photoURL: user.photoURL || '',
        rol: user.rol || '',
        departament: user.departament || '',
        path,
        area: etiquetaAreaPresencia(path),
        lastSeen: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(console.error);
  };

  const handleVisibility = () => {
    if (!document.hidden) writePresence();
  };

  const handleBeforeUnload = () => {
    stopped = true;
    if (interval) clearInterval(interval);
    deleteDoc(presenceRef).catch(() => {});
  };

  writePresence();
  interval = setInterval(writePresence, HEARTBEAT_MS);
  window.addEventListener('focus', writePresence);
  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    stopped = true;
    if (interval) clearInterval(interval);
    window.removeEventListener('focus', writePresence);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    deleteDoc(presenceRef).catch(() => {});
  };
}
