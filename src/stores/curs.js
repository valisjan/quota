import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useCursStore = defineStore('curs', () => {
  const cursos = ref([]);
  const cursActiuId = ref(null);
  let unsubCursos = null;

  const cursActiu = computed(() => cursos.value.find((c) => c.id === cursActiuId.value) || null);
  const esBloqueig = computed(() => cursActiu.value?.bloqueig === true);

  // Helpers per apuntar a subcol·leccions del curs actiu
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
    unsubCursos = onSnapshot(collection(db, 'cursos'), (snap) => {
      cursos.value = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.id.localeCompare(a.id));
      // Auto-seleccionar: el primer no bloquejat, o el més recent
      if (!cursActiuId.value || !cursos.value.find((c) => c.id === cursActiuId.value)) {
        const preferit = cursos.value.find((c) => !c.bloqueig) || cursos.value[0];
        if (preferit) cursActiuId.value = preferit.id;
      }
    });
  }

  async function crearCurs(nom) {
    const id = nom.replace('/', '-');
    await setDoc(doc(db, 'cursos', id), { nom, bloqueig: false, createdAt: new Date() });
    cursActiuId.value = id;
  }

  async function setBloqueig(cursId, valor) {
    await updateDoc(doc(db, 'cursos', cursId), { bloqueig: valor });
  }

  function canviarCursActiu(id) {
    cursActiuId.value = id;
  }

  async function eliminarCurs(cursId) {
    await deleteDoc(doc(db, 'cursos', cursId));
  }

  function aturar() {
    if (unsubCursos) {
      unsubCursos();
      unsubCursos = null;
    }
    cursos.value = [];
    cursActiuId.value = null;
  }

  return {
    cursos, cursActiuId, cursActiu, esBloqueig,
    col, docRef, nouDoc,
    inicialitzar, aturar, crearCurs, setBloqueig, canviarCursActiu, eliminarCurs,
  };
});
