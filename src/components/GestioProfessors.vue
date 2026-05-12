<template>
  <div class="form-container">
    <div
      v-if="settings.tancamentAdmin"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
    >
      Mode tancament d'administracio actiu. Consulta permesa, edicio bloquejada.
    </div>
    <h2 class="form-title">Gestio de Professors</h2>

    <div class="list-container">
      <h3 class="list-header">Professors ({{ professors.length }})</h3>

      <div
        v-if="professors.length === 0"
        class="p-8 text-center text-gray-600 dark:text-gray-400"
      >
        No hi ha professors. Sincronitza amb Google Sheets des de la pestanya
        Sincronitzacio.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="table-header">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nom</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Departament</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Jornada</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Preferència</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Motiu al·legat</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Comentaris</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Accions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="prof in professorsSorted" :key="prof.id" class="table-row">
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                <input
                  v-model="prof.nom"
                  @change="actualitzarProfessorAmbCascada(prof)"
                  :disabled="settings.tancamentAdmin"
                  type="text"
                  class="form-input text-sm py-1"
                  required
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                <select
                  v-model="prof.departament"
                  @change="actualitzarProfessor(prof)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input text-sm py-1"
                  required
                >
                  <option value="">Selecciona un departament</option>
                  <option
                    v-for="dep in departamentsSorted"
                    :key="dep.id"
                    :value="dep.nom"
                  >
                    {{ dep.nom }}
                  </option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                <select
                  v-model="prof.jornada"
                  @change="actualitzarProfessor(prof)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input text-sm py-1"
                >
                  <option value="">Completa</option>
                  <option value="M">Mitja jornada</option>
                  <option value="T">Reducció d’1/3</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                <select
                  v-model="prof.preferencia"
                  @change="actualitzarProfessor(prof)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input text-sm py-1"
                >
                  <option value="">Sense preferència</option>
                  <option value="pronto">Entrar prest</option>
                  <option value="tarde">Entrar tard</option>
                </select>
              </td>
              <td class="px-6 py-4 table-cell">
                <textarea
                  v-model="prof.motiuAllegat"
                  @change="actualitzarProfessor(prof)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input text-sm py-1"
                  rows="2"
                ></textarea>
              </td>
              <td class="px-6 py-4 table-cell">
                <textarea
                  v-model="prof.comentaris"
                  @change="actualitzarProfessor(prof)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input text-sm py-1"
                  rows="2"
                ></textarea>
              </td>
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                <button
                  @click="eliminarProfessor(prof.id)"
                  :disabled="settings.tancamentAdmin"
                  class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                >
                  Elimina
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="error" class="alert alert-error mt-4">
      {{ error }}
    </div>

    <div
      v-if="showNameChangeModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Confirmar canvi de nom
        </h3>
        <p class="text-gray-700 dark:text-gray-300 mb-4">
          Estas canviant el nom del professor de
          <strong>{{ nameChangeData.oldName }}</strong> a
          <strong>{{ nameChangeData.newName }}</strong>.
        </p>
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          Això actualitzarà automàticament totes les assignacions de classes
          d'aquest professor. Vols continuar?
        </p>
        <div class="flex gap-3">
          <button
            @click="confirmarCanviNom"
            class="btn-primary flex-1"
            :disabled="loading"
          >
            {{ loading ? 'Actualitzant...' : 'Si, actualitzar' }}
          </button>
          <button
            @click="cancelarCanviNom"
            class="btn-secondary flex-1"
            :disabled="loading"
          >
            Cancel·lar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';

const professors = ref([]);
const departaments = ref([]);
const loading = ref(false);
const error = ref(null);
const settings = ref({ ...DEFAULT_APP_SETTINGS });
let settingsUnsubscribe = null;

const showNameChangeModal = ref(false);
const nameChangeData = ref({
  professor: null,
  oldName: '',
  newName: '',
});

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

const professorsSorted = computed(() => {
  return [...professors.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

async function carregarProfessors() {
  if (!db) {
    error.value = 'Error: Base de dades no inicialitzada';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const snapshot = await getDocs(query(collection(db, 'professors')));
    professors.value = snapshot.docs.map((docu) => ({
      id: docu.id,
      ...docu.data(),
      preferencia: docu.data().preferencia || '',
      jornada: docu.data().jornada || '',
      motiuAllegat: docu.data().motiuAllegat || '',
      comentaris: docu.data().comentaris || '',
      originalNom: docu.data().nom,
    }));
  } catch (err) {
    console.error('Error carregant professors:', err);
    error.value = 'Error carregant els professors';
  } finally {
    loading.value = false;
  }
}

async function carregarDepartaments() {
  try {
    const snapshot = await getDocs(collection(db, 'departaments'));
    departaments.value = snapshot.docs
      .map((docu) => ({ id: docu.id, ...docu.data() }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  } catch (err) {
    console.error('Error carregant departaments:', err);
    error.value = 'Error carregant els departaments';
  }
}

async function eliminarProfessor(id) {
  if (settings.value.tancamentAdmin) return;
  const professor = professors.value.find((p) => p.id === id);
  if (!professor) return;

  const classesSnapshot = await getDocs(
    query(collection(db, 'classes'), where('professorAssignat', '==', professor.nom))
  );

  let confirmMessage = 'Estas segur que vols eliminar aquest professor?';
  if (!classesSnapshot.empty) {
    confirmMessage = `El professor "${professor.nom}" té ${classesSnapshot.size} classes assignades.\n\nSi l'elimines, aquestes classes quedaran sense professor assignat.\n\nVols continuar?`;
  }

  if (!confirm(confirmMessage)) return;

  loading.value = true;
  try {
    if (!classesSnapshot.empty) {
      const batch = writeBatch(db);
      classesSnapshot.docs.forEach((docSnapshot) => {
        batch.update(doc(db, 'classes', docSnapshot.id), {
          professorAssignat: '',
          professors: [],
        });
      });
      await batch.commit();
    }

    await deleteDoc(doc(db, 'professors', id));
    await carregarProfessors();
  } catch (err) {
    console.error('Error eliminant professor:', err);
    error.value = 'Error eliminant el professor';
  } finally {
    loading.value = false;
  }
}

async function actualitzarProfessorAmbCascada(professor) {
  if (settings.value.tancamentAdmin) return;
  if (!professor.nom || !professor.departament) {
    error.value = 'El nom i el departament son obligatoris';
    return;
  }

  if (professor.nom !== professor.originalNom) {
    nameChangeData.value = {
      professor,
      oldName: professor.originalNom,
      newName: professor.nom,
    };
    showNameChangeModal.value = true;
    return;
  }

  await actualitzarProfessor(professor);
}

async function confirmarCanviNom() {
  if (settings.value.tancamentAdmin) return;
  loading.value = true;
  error.value = null;

  try {
    const { professor, oldName, newName } = nameChangeData.value;
    const classesSnapshot = await getDocs(
      query(collection(db, 'classes'), where('professorAssignat', '==', oldName))
    );

    const batch = writeBatch(db);
    batch.update(doc(db, 'professors', professor.id), dadesProfessor(professor, newName));

    classesSnapshot.docs.forEach((docSnapshot) => {
      batch.update(doc(db, 'classes', docSnapshot.id), {
        professorAssignat: newName,
        professors: [newName],
      });
    });

    await batch.commit();
    professor.originalNom = newName;
    showNameChangeModal.value = false;
    await carregarProfessors();
  } catch (err) {
    console.error('Error actualitzant professor amb cascada:', err);
    error.value = 'Error actualitzant el professor i les seves assignacions';
    await carregarProfessors();
  } finally {
    loading.value = false;
  }
}

function cancelarCanviNom() {
  const professor = nameChangeData.value.professor;
  if (professor) professor.nom = professor.originalNom;
  showNameChangeModal.value = false;
  nameChangeData.value = { professor: null, oldName: '', newName: '' };
}

function dadesProfessor(professor, nom = professor.nom) {
  return {
    nom,
    departament: professor.departament,
    jornada: professor.jornada || '',
    preferencia: professor.preferencia || '',
    motiuAllegat: professor.motiuAllegat || '',
    comentaris: professor.comentaris || '',
  };
}

async function actualitzarProfessor(professor) {
  if (settings.value.tancamentAdmin) return;
  if (!professor.nom || !professor.departament) {
    error.value = 'El nom i el departament son obligatoris';
    return;
  }

  try {
    await updateDoc(doc(db, 'professors', professor.id), dadesProfessor(professor));
    professor.originalNom = professor.nom;
    error.value = '';
  } catch (err) {
    console.error('Error actualitzant professor:', err);
    error.value = 'Error actualitzant el professor';
    await carregarProfessors();
  }
}

onMounted(async () => {
  await Promise.all([carregarProfessors(), carregarDepartaments()]);
  settingsUnsubscribe = subscribeAppSettings((value) => {
    settings.value = value;
  });
});

onUnmounted(() => {
  settingsUnsubscribe?.();
});
</script>
