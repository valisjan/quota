import { ref } from 'vue';
import { defineStore } from 'pinia';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCursStore } from './curs';
import { E2E_AUTH_BYPASS } from '../services/e2e';

const DOMINI = 'iesjosepsuredaiblanes.com';

export const useAuthStore = defineStore('auth', () => {
  const estaAutenticat = ref(false);
  const esPendent = ref(false);
  const rol = ref(null);
  const usuari = ref('');
  const email = ref('');
  const photoURL = ref('');
  const departament = ref('');
  const uid = ref('');
  const authReady = ref(false);
  // stubs kept for backward compat with components that read them
  const sessionExpiry = ref(null);

  let resolveAuthReady;
  const authReadyPromise = new Promise((r) => { resolveAuthReady = r; });

  if (E2E_AUTH_BYPASS) {
    uid.value = 'e2e-admin';
    email.value = 'e2e.admin@iesjosepsuredaiblanes.com';
    usuari.value = 'E2E Admin';
    photoURL.value = '';
    rol.value = 'admin';
    departament.value = 'Catala';
    estaAutenticat.value = true;
    esPendent.value = false;
    authReady.value = true;
    resolveAuthReady?.();
    queueMicrotask(() => useCursStore().inicialitzar());
  } else {
  getRedirectResult(auth).catch(() => {});

  onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      if (firebaseUser) {
        const userEmail = firebaseUser.email || '';
        if (!userEmail.endsWith(`@${DOMINI}`)) {
          await signOut(auth);
          _clear();
          return;
        }
        const snap = await getDoc(doc(db, 'usuaris', firebaseUser.uid));
        if (snap.exists()) {
          let data = snap.data();
          // Si l'usuari és pendent, comprova si el full té un rol pre-assignat
          if (!data.rol) {
            const preSnap = await getDoc(doc(db, 'preautoritzats', userEmail));
            if (preSnap.exists()) {
              const pre = preSnap.data();
              await updateDoc(doc(db, 'usuaris', firebaseUser.uid), {
                rol: pre.rol,
                departament: pre.departament || null,
                updatedAt: new Date(),
              });
              data = { ...data, rol: pre.rol, departament: pre.departament || null };
            }
          }
          uid.value = firebaseUser.uid;
          email.value = userEmail;
          usuari.value = data.nom || firebaseUser.displayName || userEmail;
          photoURL.value = firebaseUser.photoURL || data.photoURL || '';
          rol.value = data.rol || null;
          departament.value = data.departament || '';
          estaAutenticat.value = !!data.rol;
          esPendent.value = !data.rol;
          if (data.nom !== firebaseUser.displayName || data.photoURL !== photoURL.value) {
            updateDoc(doc(db, 'usuaris', firebaseUser.uid), {
              nom: firebaseUser.displayName,
              photoURL: photoURL.value,
            }).catch(() => {});
          }
        } else {
          // Primer login: comprova si el full té un rol pre-assignat
          const preSnap = await getDoc(doc(db, 'preautoritzats', userEmail));
          const pre = preSnap.exists() ? preSnap.data() : null;
          await setDoc(doc(db, 'usuaris', firebaseUser.uid), {
            email: userEmail,
            nom: firebaseUser.displayName || userEmail,
            photoURL: firebaseUser.photoURL || '',
            rol: pre?.rol || null,
            departament: pre?.departament || null,
            createdAt: new Date(),
          });
          uid.value = firebaseUser.uid;
          email.value = userEmail;
          usuari.value = firebaseUser.displayName || userEmail;
          photoURL.value = firebaseUser.photoURL || '';
          rol.value = pre?.rol || null;
          departament.value = pre?.departament || '';
          estaAutenticat.value = !!pre?.rol;
          esPendent.value = !pre?.rol;
        }
      } else {
        _clear();
      }
    } catch (err) {
      console.error('Error carregant usuari:', err.code);
      _clear();
    } finally {
      if (!authReady.value) {
        authReady.value = true;
        resolveAuthReady?.();
      }
      // Keep cursStore in sync: start listener when authenticated, stop it when not.
      if (estaAutenticat.value) useCursStore().inicialitzar();
      else useCursStore().aturar();
    }
  });
  }

  function _clear() {
    estaAutenticat.value = false;
    esPendent.value = false;
    rol.value = null;
    usuari.value = '';
    email.value = '';
    photoURL.value = '';
    departament.value = '';
    uid.value = '';
  }

  async function waitForAuth() {
    if (authReady.value) return;
    return authReadyPromise;
  }

  async function iniciarSessioGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: DOMINI });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        throw err;
      }
    }
  }

  async function tancarSessio() {
    useCursStore().aturar();
    await signOut(auth);
  }

  function esAdmin() {
    return estaAutenticat.value && rol.value === 'admin';
  }

  function esCapDepartament() {
    return estaAutenticat.value && ['cap_departament', 'departament', 'admin'].includes(rol.value);
  }

  function esProfessor() {
    return estaAutenticat.value;
  }

  // Stubs for backward compat
  async function inicialitzarContrasenya() {}
  function verificarSessio() { return estaAutenticat.value; }
  function renovarSessio() {}

  return {
    estaAutenticat,
    esPendent,
    rol,
    usuari,
    email,
    photoURL,
    departament,
    uid,
    authReady,
    sessionExpiry,
    waitForAuth,
    iniciarSessioGoogle,
    tancarSessio,
    esAdmin,
    esCapDepartament,
    esProfessor,
    inicialitzarContrasenya,
    verificarSessio,
    renovarSessio,
  };
});
