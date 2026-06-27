import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { E2E_AUTH_BYPASS } from '../services/e2e';

/**
 * Gestiona la presència en temps real al departament actiu.
 * Reacciona tant al canvi de departament com al canvi de curs actiu.
 *
 * @param {object}      opts
 * @param {Ref<string>} opts.departamentSeleccionat  Nom del departament actiu
 * @param {object}      opts.authStore               Store d'autenticació
 * @param {object}      opts.cursStore               Store del curs actiu
 * @param {Ref<string>} opts.sessionId               ID únic de la sessió
 */
export function usePresenceDepartament({ departamentSeleccionat, authStore, cursStore, sessionId }) {
  const activeUsers = ref(1);
  const usuarisActius = ref([]);

  let presenceRef = null;
  let presenceRefCursId = null; // cursId amb el qual es va crear presenceRef (per esborrar el doc correcte)
  let presenceUnsubscribe = null;
  let presenceInterval = null;
  let beforeunloadHandler = null;

  function getUserData() {
    return {
      uid: authStore.uid || '',
      usuari: authStore.usuari || authStore.rolActiu || authStore.rol || 'Usuari',
      email: authStore.email || '',
      photoURL: authStore.photoURL || '',
      rol: authStore.rolActiu || authStore.rol || '',
      path: '/departament',
    };
  }

  function cleanup() {
    presenceUnsubscribe?.();
    presenceUnsubscribe = null;
    if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
    if (beforeunloadHandler) {
      window.removeEventListener('beforeunload', beforeunloadHandler);
      beforeunloadHandler = null;
    }
    presenceRef = null;
    presenceRefCursId = null;
  }

  function deletePresenceDoc(dept, cursId) {
    if (!dept || !cursId) return;
    deleteDoc(doc(db, 'cursos', cursId, 'presence', `${dept}_${sessionId.value}`))
      .catch(console.error);
  }

  function setup(dept, cursId) {
    cleanup();
    if (!dept || !cursId) return;

    presenceRefCursId = cursId;
    presenceRef = doc(db, 'cursos', cursId, 'presence', `${dept}_${sessionId.value}`);

    setDoc(presenceRef, {
      scope: 'departament',
      departament: dept,
      sessionId: sessionId.value,
      ...getUserData(),
      timestamp: serverTimestamp(),
      lastSeen: serverTimestamp(),
    }).catch(console.error);

    presenceUnsubscribe = onSnapshot(
      query(
        collection(db, 'cursos', cursId, 'presence'),
        where('departament', '==', dept)
      ),
      (snapshot) => {
        const now = Date.now();
        let count = 0;
        const noms = [];
        snapshot.docs.forEach((d) => {
          const lastSeen = d.data().lastSeen?.toMillis?.();
          if (lastSeen && now - lastSeen < 30000) {
            count++;
            noms.push(d.data().usuari || d.data().rol || 'Usuari');
          }
        });
        activeUsers.value = Math.max(1, count);
        usuarisActius.value = [...new Set(noms)];
      },
      (err) => console.error('Error carregant presència:', err)
    );

    presenceInterval = setInterval(() => {
      if (presenceRef) {
        setDoc(presenceRef, { lastSeen: serverTimestamp(), ...getUserData() }, { merge: true })
          .catch(console.error);
      }
    }, 10000);

    beforeunloadHandler = () => {
      if (presenceRef) deleteDoc(presenceRef).catch(console.error);
      clearInterval(presenceInterval);
    };
    window.addEventListener('beforeunload', beforeunloadHandler);
  }

  // Reacciona tant al canvi de departament com al canvi de curs actiu
  watch(
    [departamentSeleccionat, () => cursStore.cursActiuId],
    ([newDept, newCursId], [oldDept]) => {
      if (E2E_AUTH_BYPASS) return;
      if (oldDept && presenceRefCursId) deletePresenceDoc(oldDept, presenceRefCursId);
      cleanup();
      if (newDept && newCursId) nextTick(() => setup(newDept, newCursId));
    }
  );

  onMounted(() => {
    if (!E2E_AUTH_BYPASS && departamentSeleccionat.value && cursStore.cursActiuId) {
      setup(departamentSeleccionat.value, cursStore.cursActiuId);
    }
  });

  onUnmounted(() => {
    if (!E2E_AUTH_BYPASS && departamentSeleccionat.value && presenceRefCursId) {
      deletePresenceDoc(departamentSeleccionat.value, presenceRefCursId);
    }
    cleanup();
  });

  return { activeUsers, usuarisActius };
}
