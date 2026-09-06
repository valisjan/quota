import {
  collection,
  deleteDoc,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { E2E_AUTH_BYPASS, E2E_CURS_ID } from './e2e';
import { normalizePatioConfig } from '../modules/guardies/domain/patio';

const FILE_KINDS = new Set(['reference', 'untis', 'duties']);
const DELETABLE_FILE_KINDS = new Set([...FILE_KINDS, 'schedule']);
const MAX_FILE_BYTES = 850 * 1024;
const E2E_PREFIX = 'quota-e2e-guardies:';

function getE2EData(cursId) {
  const raw = localStorage.getItem(`${E2E_PREFIX}${cursId}`);
  if (!raw) return { files: {}, convivencia: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { files: {}, convivencia: {} };
  }
}

function setE2EData(cursId, data) {
  localStorage.setItem(`${E2E_PREFIX}${cursId}`, JSON.stringify(data));
}

function subscribeE2E(cursId, callback) {
  const key = `${E2E_PREFIX}${cursId}`;
  const listener = (event) => {
    if (event.key === key) callback(getE2EData(cursId));
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

function guardiesRef(cursId, id) {
  if (!cursId) throw new Error('No hi ha cap curs acadèmic disponible.');
  return doc(db, 'cursos', cursId, 'guardies', id);
}

function guardiesDayRef(cursId, date) {
  if (!cursId) throw new Error('No hi ha cap curs acadèmic disponible.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('La data de guàrdies no és vàlida.');
  return doc(db, 'cursos', cursId, 'guardiesDays', date);
}

function guardiesStatsRef(cursId) {
  return guardiesRef(cursId, 'stats');
}

async function normalizeFile(data) {
  if (!data?.text) return null;
  return {
    text: data.text,
    name: data.name || 'fitxer',
    size: Number(data.size) || new TextEncoder().encode(data.text).byteLength,
  };
}

async function loadStoredFile(data) {
  if (!data) return null;
  if (data.text) return normalizeFile(data);
  return null;
}

function isOfflineError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return error?.code === 'unavailable' || message.includes('client is offline');
}

async function withNetworkRetry(operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    await enableNetwork(db).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 350));
    return operation();
  }
}

function normalizeConvivencia(data) {
  return data?.assignacions && typeof data.assignacions === 'object'
    ? data.assignacions
    : {};
}

function normalizePati(data) {
  if (!data || typeof data !== 'object') return null;
  return normalizePatioConfig(data, { startYear: data.startYear });
}

function validateFile(kind, text, name) {
  if (!FILE_KINDS.has(kind)) throw new Error('Tipus de fitxer de guàrdies no reconegut.');
  const cleanText = String(text || '');
  const size = new TextEncoder().encode(cleanText).byteLength;
  if (!cleanText.trim()) throw new Error('El fitxer està buit.');
  if (size > MAX_FILE_BYTES) throw new Error('El fitxer supera el límit de 850 KB.');
  return {
    kind,
    text: cleanText,
    name: String(name || 'fitxer').slice(0, 180),
    size,
  };
}

function waitForUser() {
  if (E2E_AUTH_BYPASS) return Promise.resolve({ uid: 'e2e-admin' });
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function resolveCourse(requestedCourseId) {
  if (E2E_AUTH_BYPASS) return { id: E2E_CURS_ID, name: 'E2E 2026-27' };
  if (requestedCourseId && /^[\w-]{1,100}$/.test(requestedCourseId)) {
    try {
      const requested = await withNetworkRetry(() => getDoc(doc(db, 'cursos', requestedCourseId)));
      if (requested.exists()) return { id: requested.id, name: requested.data().nom || requested.id };
    } catch (error) {
      if (isOfflineError(error)) return { id: requestedCourseId, name: requestedCourseId };
      throw error;
    }
  }
  const snapshot = await withNetworkRetry(() => getDocs(collection(db, 'cursos')));
  const courses = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => b.id.localeCompare(a.id, 'ca', { numeric: true }));
  const selected = courses.find((course) => course.id === requestedCourseId)
    || courses.find((course) => !course.bloqueig)
    || courses[0];
  if (!selected) throw new Error('No hi ha cap curs acadèmic configurat a Quota.');
  return { id: selected.id, name: selected.nom || selected.id };
}

export async function getGuardiesContext(requestedCourseId = '') {
  if (E2E_AUTH_BYPASS) {
    return {
      user: { uid: 'e2e-admin' },
      course: await resolveCourse(requestedCourseId),
      canWrite: true,
    };
  }

  const user = await waitForUser();
  if (!user) throw new Error('Inicia sessió a Quota per accedir a les dades de guàrdies.');
  const userSnapshot = await withNetworkRetry(() => getDoc(doc(db, 'usuaris', user.uid)));
  const role = userSnapshot.exists() ? userSnapshot.data().rol : '';
  return {
    user,
    course: await resolveCourse(requestedCourseId),
    canWrite: role === 'admin',
  };
}

export async function loadGuardiesData(cursId) {
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    return {
      files: {
        reference: data.files.reference || null,
        untis: data.files.untis || null,
        duties: data.files.duties || null,
      },
      convivencia: data.convivencia || {},
      pati: normalizePati(data.pati),
    };
  }

  const [reference, untis, duties, convivencia, pati] = await withNetworkRetry(() => Promise.all([
    getDoc(guardiesRef(cursId, 'reference')),
    getDoc(guardiesRef(cursId, 'untis')),
    getDoc(guardiesRef(cursId, 'duties')),
    getDoc(guardiesRef(cursId, 'convivencia')),
    getDoc(guardiesRef(cursId, 'pati')),
  ]));
  return {
    files: {
      reference: reference.exists() ? await loadStoredFile(reference.data()) : null,
      untis: untis.exists() ? await loadStoredFile(untis.data()) : null,
      duties: duties.exists() ? await loadStoredFile(duties.data()) : null,
    },
    convivencia: convivencia.exists() ? normalizeConvivencia(convivencia.data()) : {},
    pati: pati.exists() ? normalizePati(pati.data()) : null,
  };
}

export function subscribeGuardiesData(cursId, onChange, onError = () => {}) {
  if (E2E_AUTH_BYPASS) {
    return subscribeE2E(cursId, (data) => {
      Promise.resolve(onChange({
        files: {
          reference: data.files?.reference || null,
          untis: data.files?.untis || null,
          duties: data.files?.duties || null,
        },
        convivencia: data.convivencia || {},
        pati: normalizePati(data.pati),
        stats: data.stats || { counts: {} },
      })).catch(onError);
    });
  }

  return onSnapshot(collection(db, 'cursos', cursId, 'guardies'), async (snapshot) => {
    try {
      const documents = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
      await onChange({
        files: {
          reference: await loadStoredFile(documents.get('reference')),
          untis: await loadStoredFile(documents.get('untis')),
          duties: await loadStoredFile(documents.get('duties')),
        },
        convivencia: normalizeConvivencia(documents.get('convivencia')),
        pati: normalizePati(documents.get('pati')),
        stats: documents.get('stats') || { counts: {} },
      });
    } catch (error) {
      onError(error);
    }
  }, onError);
}

export async function loadGuardiesStats(cursId) {
  if (E2E_AUTH_BYPASS) {
    return getE2EData(cursId).stats || { counts: {} };
  }
  const snapshot = await withNetworkRetry(() => getDoc(guardiesStatsRef(cursId)));
  return snapshot.exists() ? snapshot.data() : { counts: {} };
}

export async function saveGuardiesFile(cursId, kind, text, name) {
  const file = validateFile(kind, text, name);
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.files[kind] = file;
    setE2EData(cursId, data);
    return file;
  }
  await setDoc(guardiesRef(cursId, kind), {
    kind: file.kind,
    name: file.name,
    size: file.size,
    text: file.text,
    encoding: 'utf-8',
    updatedAt: serverTimestamp(),
  });
  return file;
}

export async function deleteGuardiesFile(cursId, kind) {
  if (!DELETABLE_FILE_KINDS.has(kind)) return;
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    delete data.files[kind];
    setE2EData(cursId, data);
    return;
  }
  await deleteDoc(guardiesRef(cursId, kind));
}

export async function saveGuardiesConvivencia(cursId, assignacions) {
  const cleanAssignments = assignacions && typeof assignacions === 'object' ? assignacions : {};
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.convivencia = cleanAssignments;
    setE2EData(cursId, data);
    return;
  }
  await setDoc(guardiesRef(cursId, 'convivencia'), {
    assignacions: cleanAssignments,
    updatedAt: serverTimestamp(),
  });
}

export async function saveGuardiesPati(cursId, config) {
  const clean = normalizePatioConfig(config, { startYear: config?.startYear });
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.pati = clean;
    setE2EData(cursId, data);
    return clean;
  }
  await setDoc(guardiesRef(cursId, 'pati'), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
  return clean;
}

export async function loadGuardiesDay(cursId, date) {
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    return data.days?.[date] || null;
  }
  try {
    const snapshot = await withNetworkRetry(() => getDoc(guardiesDayRef(cursId, date)));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    if (error?.code === 'permission-denied') return null;
    throw error;
  }
}

export function subscribeGuardiesDay(cursId, date, onChange, onError = () => {}, { publishedOnly = false } = {}) {
  if (E2E_AUTH_BYPASS) {
    return subscribeE2E(cursId, (data) => onChange(data.days?.[date] || null, {
      fromCache: false,
      hasPendingWrites: false,
    }));
  }

  if (publishedOnly) {
    const publishedDays = query(
      collection(db, 'cursos', cursId, 'guardiesDays'),
      where('status', 'in', ['published', 'closed']),
    );
    return onSnapshot(publishedDays, (snapshot) => {
      const selected = snapshot.docs.find((item) => item.id === date);
      onChange(selected?.data() || null, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    }, onError);
  }

  return onSnapshot(guardiesDayRef(cursId, date), (snapshot) => {
    onChange(snapshot.exists() ? snapshot.data() : null, {
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
    });
  }, onError);
}

export async function saveGuardiesDay(cursId, date, payload, expectedRevision = 0) {
  const clean = {
    schemaVersion: 1,
    date,
    status: payload.status || 'draft',
    absenceIds: Array.from(new Set(payload.absenceIds || [])).filter(Boolean),
    assignments: payload.assignments && typeof payload.assignments === 'object' ? payload.assignments : {},
    comments: payload.comments && typeof payload.comments === 'object' ? payload.comments : {},
    groupsOut: Array.from(new Set(payload.groupsOut || [])).filter(Boolean),
    groupTeachers: payload.groupTeachers && typeof payload.groupTeachers === 'object' ? payload.groupTeachers : {},
    groupReleasedTeachers: payload.groupReleasedTeachers && typeof payload.groupReleasedTeachers === 'object' ? payload.groupReleasedTeachers : {},
    partialGroups: Array.from(new Set(payload.partialGroups || [])).filter(Boolean),
    outingAbsenceIds: Array.from(new Set(payload.outingAbsenceIds || [])).filter(Boolean),
    cancelledAssignments: Array.from(new Set(payload.cancelledAssignments || [])).filter(Boolean),
    publishedAt: String(payload.publishedAt || ''),
    closedAt: String(payload.closedAt || ''),
    countedAssignments: Array.isArray(payload.countedAssignments) ? payload.countedAssignments.filter(Boolean) : [],
  };
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.days ||= {};
    const currentRevision = Number(data.days[date]?.revision) || 0;
    if (currentRevision !== expectedRevision) throw new Error('La jornada ha canviat en una altra pestanya. Torna-la a carregar.');
    data.days[date] = { ...clean, revision: currentRevision + 1, clientUpdatedAt: new Date().toISOString() };
    setE2EData(cursId, data);
    return data.days[date];
  }
  return runTransaction(db, async (transaction) => {
    const reference = guardiesDayRef(cursId, date);
    const snapshot = await transaction.get(reference);
    const currentRevision = snapshot.exists() ? Number(snapshot.data().revision) || 0 : 0;
    if (currentRevision !== expectedRevision) {
      throw new Error('La jornada ha canviat en una altra pestanya. Torna-la a carregar.');
    }
    const next = {
      ...clean,
      revision: currentRevision + 1,
      clientUpdatedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(reference, next);
    return { ...clean, revision: currentRevision + 1 };
  });
}

function frequency(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

export async function transitionGuardiesDay(cursId, date, action) {
  if (!['publish', 'close', 'reopen'].includes(action)) throw new Error('Acció de jornada no reconeguda.');
  const now = new Date().toISOString();
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.days ||= {};
    const day = data.days[date];
    if (!day) throw new Error('La jornada encara no existeix.');
    const previousCounted = day.countedAssignments || [];
    if (action === 'publish') Object.assign(day, { status: 'published', publishedAt: day.publishedAt || now, closedAt: '' });
    if (action === 'reopen') Object.assign(day, { status: 'published', closedAt: '' });
    if (action === 'close') {
      const cancelled = new Set(day.cancelledAssignments || []);
      const countedAssignments = Object.entries(day.assignments || {})
        .filter(([absenceId]) => !cancelled.has(absenceId))
        .map(([, teacherId]) => teacherId)
        .filter(Boolean);
      data.stats ||= { counts: {} };
      const previous = frequency(previousCounted);
      const next = frequency(countedAssignments);
      new Set([...Object.keys(previous), ...Object.keys(next)]).forEach((teacherId) => {
        data.stats.counts[teacherId] = Math.max(0, Number(data.stats.counts[teacherId] || 0) + (next[teacherId] || 0) - (previous[teacherId] || 0));
      });
      Object.assign(day, { status: 'closed', closedAt: now, countedAssignments });
    }
    day.clientUpdatedAt = now;
    day.revision = (Number(day.revision) || 0) + 1;
    setE2EData(cursId, data);
    return { day, stats: data.stats || { counts: {} } };
  }

  return runTransaction(db, async (transaction) => {
    const dayReference = guardiesDayRef(cursId, date);
    const statsReference = guardiesStatsRef(cursId);
    const [daySnapshot, statsSnapshot] = await Promise.all([
      transaction.get(dayReference),
      transaction.get(statsReference),
    ]);
    if (!daySnapshot.exists()) throw new Error('La jornada encara no existeix.');
    const day = daySnapshot.data();
    const update = {
      revision: (Number(day.revision) || 0) + 1,
      clientUpdatedAt: now,
      updatedAt: serverTimestamp(),
    };
    let stats = statsSnapshot.exists() ? statsSnapshot.data() : { counts: {} };
    if (action === 'publish') Object.assign(update, { status: 'published', publishedAt: day.publishedAt || now, closedAt: '' });
    if (action === 'reopen') Object.assign(update, { status: 'published', closedAt: '' });
    if (action === 'close') {
      const cancelled = new Set(day.cancelledAssignments || []);
      const countedAssignments = Object.entries(day.assignments || {})
        .filter(([absenceId]) => !cancelled.has(absenceId))
        .map(([, teacherId]) => teacherId)
        .filter(Boolean);
      const counts = { ...(stats.counts || {}) };
      const previous = frequency(day.countedAssignments || []);
      const next = frequency(countedAssignments);
      new Set([...Object.keys(previous), ...Object.keys(next)]).forEach((teacherId) => {
        counts[teacherId] = Math.max(0, Number(counts[teacherId] || 0) + (next[teacherId] || 0) - (previous[teacherId] || 0));
      });
      Object.assign(update, { status: 'closed', closedAt: now, countedAssignments });
      stats = { counts, updatedAt: serverTimestamp() };
      transaction.set(statsReference, stats);
    }
    transaction.update(dayReference, update);
    return { day: { ...day, ...update }, stats };
  });
}

export async function mergeGuardiesDayPlan(cursId, date, patch) {
  const additions = Array.from(new Set(patch.absenceIds || [])).filter(Boolean);
  const groups = Array.from(new Set(patch.groupsOut || [])).filter(Boolean);
  const partialGroups = Array.from(new Set(patch.partialGroups || [])).filter(Boolean);
  const completeGroups = new Set(Array.from(new Set(patch.completeGroups || [])).filter(Boolean));
  if (E2E_AUTH_BYPASS) {
    const data = getE2EData(cursId);
    data.days ||= {};
    const current = data.days[date] || {
      schemaVersion: 1, date, status: 'draft', absenceIds: [], assignments: {}, comments: {},
      groupsOut: [], groupTeachers: {}, groupReleasedTeachers: {}, partialGroups: [], outingAbsenceIds: [], cancelledAssignments: [], publishedAt: '', closedAt: '',
      countedAssignments: [], revision: 0,
    };
    if (current.status === 'closed') return current;
    data.days[date] = {
      ...current,
      absenceIds: Array.from(new Set([...(current.absenceIds || []), ...additions])),
      groupsOut: Array.from(new Set([...(current.groupsOut || []), ...groups])),
      groupTeachers: { ...(current.groupTeachers || {}), ...(patch.groupTeachers || {}) },
      groupReleasedTeachers: { ...(current.groupReleasedTeachers || {}), ...(patch.groupReleasedTeachers || {}) },
      partialGroups: Array.from(new Set([...(current.partialGroups || []).filter((groupId) => !completeGroups.has(groupId)), ...partialGroups])),
      revision: (Number(current.revision) || 0) + 1,
      clientUpdatedAt: new Date().toISOString(),
    };
    setE2EData(cursId, data);
    return data.days[date];
  }
  return runTransaction(db, async (transaction) => {
    const reference = guardiesDayRef(cursId, date);
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {
      schemaVersion: 1, date, status: 'draft', absenceIds: [], assignments: {}, comments: {},
      groupsOut: [], groupTeachers: {}, groupReleasedTeachers: {}, partialGroups: [], outingAbsenceIds: [], cancelledAssignments: [], publishedAt: '', closedAt: '',
      countedAssignments: [], revision: 0,
    };
    if (current.status === 'closed') return current;
    const next = {
      ...current,
      schemaVersion: 1,
      date,
      absenceIds: Array.from(new Set([...(current.absenceIds || []), ...additions])),
      groupsOut: Array.from(new Set([...(current.groupsOut || []), ...groups])),
      groupTeachers: { ...(current.groupTeachers || {}), ...(patch.groupTeachers || {}) },
      groupReleasedTeachers: { ...(current.groupReleasedTeachers || {}), ...(patch.groupReleasedTeachers || {}) },
      partialGroups: Array.from(new Set([...(current.partialGroups || []).filter((groupId) => !completeGroups.has(groupId)), ...partialGroups])),
      revision: (Number(current.revision) || 0) + 1,
      clientUpdatedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(reference, next);
    return next;
  });
}
