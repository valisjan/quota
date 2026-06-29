import { computed, ref } from 'vue';
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
  const departaments = ref([]);
  const uid = ref('');
  const authReady = ref(false);
  const rolVista = ref(null);
  const departamentVista = ref('');
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
    departaments.value = ['Catala'];
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
          const preSnap = await getDoc(doc(db, 'preautoritzats', userEmail));
          const pre = preSnap.exists() ? preSnap.data() : null;
          if (pre && calAplicarPreautoritzacio(data, pre)) {
            const preDepartaments = normalitzarDepartamentsUsuari(pre);
            const actualitzacio = {
              rol: pre.rol,
              departament: pre.departament || preDepartaments[0] || null,
              departaments: preDepartaments,
              updatedAt: new Date(),
            };
            await updateDoc(doc(db, 'usuaris', firebaseUser.uid), actualitzacio);
            data = { ...data, ...actualitzacio };
          }
          uid.value = firebaseUser.uid;
          email.value = userEmail;
          usuari.value = data.nom || firebaseUser.displayName || userEmail;
          photoURL.value = firebaseUser.photoURL || data.photoURL || '';
          rol.value = data.rol || null;
          departament.value = data.departament || '';
          departaments.value = normalitzarDepartamentsUsuari(data);
          estaAutenticat.value = !!data.rol;
          esPendent.value = !data.rol;
          updateDoc(doc(db, 'usuaris', firebaseUser.uid), {
            nom: firebaseUser.displayName,
            photoURL: photoURL.value,
            lastLogin: new Date(),
          }).catch(() => {});
        } else {
          // Primer login: comprova si el full té un rol pre-assignat
          const preSnap = await getDoc(doc(db, 'preautoritzats', userEmail));
          const pre = preSnap.exists() ? preSnap.data() : null;
          const preDepartaments = normalitzarDepartamentsUsuari(pre || {});
          await setDoc(doc(db, 'usuaris', firebaseUser.uid), {
            email: userEmail,
            nom: firebaseUser.displayName || userEmail,
            photoURL: firebaseUser.photoURL || '',
            rol: pre?.rol || null,
            departament: pre?.departament || preDepartaments[0] || null,
            departaments: preDepartaments,
            createdAt: new Date(),
            lastLogin: new Date(),
          });
          uid.value = firebaseUser.uid;
          email.value = userEmail;
          usuari.value = firebaseUser.displayName || userEmail;
          photoURL.value = firebaseUser.photoURL || '';
          rol.value = pre?.rol || null;
          departament.value = pre?.departament || preDepartaments[0] || '';
          departaments.value = preDepartaments;
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
    rolVista.value = null;
    usuari.value = '';
    email.value = '';
    photoURL.value = '';
    departament.value = '';
    departaments.value = [];
    departamentVista.value = '';
    uid.value = '';
  }

  const esVistaSimulada = computed(() => rol.value === 'admin' && Boolean(rolVista.value));
  const rolActiu = computed(() => esVistaSimulada.value ? rolVista.value : rol.value);
  function normalitzarDepartamentsUsuari(data = {}) {
    return [
      ...(Array.isArray(data.departaments) ? data.departaments : []),
      data.departament,
    ]
      .map((valor) => (valor || '').toString().trim())
      .filter(Boolean)
      .filter((valor, index, array) => array.indexOf(valor) === index);
  }

  const departamentsActius = computed(() => {
    if (esVistaSimulada.value) return departamentVista.value ? [departamentVista.value] : [];
    return departaments.value.length ? departaments.value : normalitzarDepartamentsUsuari({ departament: departament.value });
  });

  const departamentActiu = computed(() => departamentsActius.value[0] || '');

  function mateixosDepartaments(a = [], b = []) {
    if (a.length !== b.length) return false;
    const bSet = new Set(b);
    return a.every((valor) => bSet.has(valor));
  }

  function calAplicarPreautoritzacio(data = {}, pre = {}) {
    if (!pre.rol) return false;
    if (data.rol === 'admin' && pre.rol !== 'admin') return false;
    if (!data.rol) return true;
    const preDepartaments = normalitzarDepartamentsUsuari(pre);
    const dataDepartaments = normalitzarDepartamentsUsuari(data);
    return (
      data.rol !== pre.rol ||
      (data.departament || '') !== (pre.departament || preDepartaments[0] || '') ||
      !mateixosDepartaments(dataDepartaments, preDepartaments)
    );
  }

  function esAdminReal() {
    return estaAutenticat.value && rol.value === 'admin';
  }

  function activarVistaRol(nouRol, nouDepartament = '') {
    if (!esAdminReal()) return;
    if (!nouRol || nouRol === 'admin') {
      rolVista.value = null;
      departamentVista.value = '';
      return;
    }
    rolVista.value = nouRol;
    departamentVista.value = ['cap_departament', 'departament'].includes(nouRol)
      ? (nouDepartament || departamentVista.value || '')
      : '';
  }

  function actualitzarDepartamentVista(nouDepartament) {
    if (!esAdminReal() || !['cap_departament', 'departament'].includes(rolVista.value)) return;
    departamentVista.value = nouDepartament || '';
  }

  function netejarVistaRol() {
    rolVista.value = null;
    departamentVista.value = '';
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
    return estaAutenticat.value && rolActiu.value === 'admin';
  }

  function esCapDepartament() {
    return estaAutenticat.value && ['cap_departament', 'departament', 'admin'].includes(rolActiu.value);
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
    rolActiu,
    rolVista,
    usuari,
    email,
    photoURL,
    departament,
    departaments,
    departamentsActius,
    departamentActiu,
    departamentVista,
    uid,
    authReady,
    sessionExpiry,
    esVistaSimulada,
    waitForAuth,
    iniciarSessioGoogle,
    tancarSessio,
    esAdminReal,
    esAdmin,
    esCapDepartament,
    esProfessor,
    activarVistaRol,
    actualitzarDepartamentVista,
    netejarVistaRol,
    inicialitzarContrasenya,
    verificarSessio,
    renovarSessio,
  };
});
