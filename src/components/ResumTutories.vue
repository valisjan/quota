<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
          :class="
            isConnected
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
          "
        >
          <div
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
        </div>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Última actualització: {{ lastUpdate }}
      </div>
    </div>

    <section
      class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between gap-4"
      >
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Tutories
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ tutoriesOrdenades.length }} tutors
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 dark:text-gray-300">Ordena per</span>
          <select
            v-model="ordenacio"
            class="form-input text-sm py-2 bg-white dark:bg-gray-800"
          >
            <option value="curs">Curs</option>
            <option value="professor">Professor</option>
          </select>
        </div>
      </div>

      <div
        v-if="tutoriesOrdenades.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400 italic"
      >
        No hi ha tutories assignades.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Curs</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Grup</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Tutor</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">*Tutoria</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Hores</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="tutoria in tutoriesOrdenades"
              :key="tutoria.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
                {{ tutoria.curs || 'Sense curs' }}
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                {{ tutoria.grup || 'Sense grup' }}
              </td>
              <td class="px-6 py-3">
                <span v-if="tutoria.professorAssignat" class="text-gray-700 dark:text-gray-300">
                  {{ tutoria.professorAssignat }}
                </span>
                <span v-else class="text-red-600 dark:text-red-400 font-medium">
                  Sense tutor assignat
                </span>
              </td>
              <td class="px-6 py-3">
                <span
                  v-if="tutoriaAsteriscAssignada(tutoria)"
                  class="text-gray-700 dark:text-gray-300"
                >
                  {{ tutoriaAsteriscAssignada(tutoria).professorAssignat }}
                </span>
                <span
                  v-else-if="tutoriaAsterisc(tutoria)"
                  class="text-red-600 dark:text-red-400 font-medium"
                >
                  Sense assignar
                </span>
                <span v-else class="text-gray-400 dark:text-gray-500 italic">
                  No importada
                </span>
              </td>
              <td class="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                {{ tutoria.hores }}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { esTutoriaPrincipal, trobarTutoriaAsterisc } from '../utils/tutories';

const cursStore = useCursStore();

const classes = ref([]);
const ordenacio = ref('curs');
const isConnected = ref(true);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

let classesUnsubscribe = null;

function updateLastUpdate() {
  lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const tutories = computed(() => {
  return classes.value.filter(esTutoriaPrincipal);
});

const tutoriesOrdenades = computed(() => {
  return [...tutories.value].sort((a, b) => {
    if (ordenacio.value === 'professor') {
      const professor = (a.professorAssignat || '').localeCompare(
        b.professorAssignat || ''
      );
      if (professor !== 0) return professor;
    }

    const curs = (a.curs || '').localeCompare(b.curs || '');
    if (curs !== 0) return curs;
    const grup = (a.grup || '').localeCompare(b.grup || '');
    if (grup !== 0) return grup;
    return (a.professorAssignat || '').localeCompare(b.professorAssignat || '');
  });
});

function tutoriaAsterisc(tutoria) {
  return trobarTutoriaAsterisc(tutoria, classes.value);
}

function tutoriaAsteriscAssignada(tutoria) {
  const asterisc = tutoriaAsterisc(tutoria);
  if (!asterisc?.professorAssignat) return null;
  return asterisc;
}

function setupRealtimeListeners() {
  cleanupListeners();
  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snapshot) => {
      classes.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );
}

function cleanupListeners() {
  classesUnsubscribe?.();
  classesUnsubscribe = null;
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(cleanupListeners);
</script>
