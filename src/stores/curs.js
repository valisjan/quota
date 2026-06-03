import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { eliminarCursAcademicComplet } from '../services/cursCleanup';

const STORAGE_KEY = 'quota_curs_actiu';

export const useCursStore = defineStore('curs', () => {
  const cursos = ref([]);
  const cursActiuId = ref(localStorage.getItem(STORAGE_KEY) || null);
  const cursosReady = ref(false);
  const cursosError = ref('');
  let unsubCursos = null;

  const cursActiu = computed(() => cursos.value.find((c) => c.id === cursActiuId.value) || null);
  const esBloqueig = computed(() => cursActiu.value?.bloqueig === true);

  // Helpers per apuntar a subcolleccions del curs actiu.
  function col(nom) {
    return collection(db, 'cursos', cursActiuId.value, nom);
  }
  function docRef(colNom, id) {
    return doc(db, 'cursos', cursActiuId.value, colNom, id);
  }
  function nouDoc(colNom) {
    return doc(collection(db, 'cursos', cursActiuId.value, colNom));
  }

  function inicialitzar() {
    if (unsubCursos) return;
    cursosReady.value = false;
    cursosError.value = '';
    unsubCursos = onSnapshot(
      collection(db, 'cursos'),
      (snap) => {
        cursos.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.id.localeCompare(a.id));

        const cursGuardat = localStorage.getItem(STORAGE_KEY);
        if (!cursActiuId.value && cursGuardat) {
          cursActiuId.value = cursGuardat;
        }

        // Mantenir el curs guardat; auto-seleccionar només si no existeix.
        if (!cursActiuId.value || !cursos.value.find((c) => c.id === cursActiuId.value)) {
          const preferit = cursos.value.find((c) => !c.bloqueig) || cursos.value[0];
          cursActiuId.value = preferit?.id || null;
          if (cursActiuId.value) localStorage.setItem(STORAGE_KEY, cursActiuId.value);
          else localStorage.removeItem(STORAGE_KEY);
        }
        cursosReady.value = true;
      },
      (error) => {
        cursosError.value = error?.message || "No s'han pogut carregar els cursos.";
        cursosReady.value = true;
      }
    );
  }

  async function crearCurs(nom) {
    const id = nom.replace('/', '-');
    await setDoc(doc(db, 'cursos', id), { nom, bloqueig: false, createdAt: new Date() });
    cursActiuId.value = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  async function setBloqueig(cursId, valor) {
    await updateDoc(doc(db, 'cursos', cursId), { bloqueig: valor });
  }

  function canviarCursActiu(id) {
    cursActiuId.value = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  async function eliminarCurs(cursId, options = {}) {
    return eliminarCursAcademicComplet(cursId, options);
  }

  function aturar() {
    if (unsubCursos) {
      unsubCursos();
      unsubCursos = null;
    }
    cursos.value = [];
    cursosReady.value = false;
    cursosError.value = '';
  }

  return {
    cursos,
    cursActiuId,
    cursActiu,
    esBloqueig,
    cursosReady,
    cursosError,
    col,
    docRef,
    nouDoc,
    inicialitzar,
    aturar,
    crearCurs,
    setBloqueig,
    canviarCursActiu,
    eliminarCurs,
  };
});
