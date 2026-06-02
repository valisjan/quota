<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
          :class="isConnected ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'"
        >
          <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
          {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
        </div>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Última actualització: {{ lastUpdate }}
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Professors per sota de les hores recomanades
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ professorsPocesHores.length }} professors
          </p>
        </div>
      </div>

      <div v-if="professorsPocesHores.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400 italic">
        Tots els professors arriben a les hores recomanades per la seva jornada.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Professor</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Departament</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Objectiu</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Hores lectives</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Diferència</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="professor in professorsPocesHores"
              :key="professor.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
                {{ professor.nom }}
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                {{ professor.departament }}
              </td>
              <td class="px-6 py-3 text-center text-gray-600 dark:text-gray-300">
                {{ professor.objectiu }}h
              </td>
              <td class="px-6 py-3 text-center">
                <span class="px-2 py-1 rounded-full font-semibold text-sm"
                  :class="professor.hores === 0
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'"
                >
                  {{ professor.hores }}h
                </span>
              </td>
              <td class="px-6 py-3 text-center text-red-600 dark:text-red-400 font-medium">
                -{{ professor.diferencia }}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useColSnapshot } from '../composables/useColSnapshot';
import { limitsHoresProfessor, calcularHoresLectives } from '../utils/horesProfessor';

const { items: classes, isConnected: classesOk, lastUpdate } = useColSnapshot('classes');
const { items: professors, isConnected: profsOk } = useColSnapshot('professors');
const isConnected = computed(() => classesOk.value && profsOk.value);

const professorsPocesHores = computed(() => {
  return professors.value
    .map(p => {
      const objectiu = limitsHoresProfessor(p).ideal;
      const hores = calcularHoresLectives(classes.value, p.nom);
      return {
        ...p,
        hores,
        objectiu,
        diferencia: objectiu - hores,
      };
    })
    .filter(p => p.hores < p.objectiu)
    .sort((a, b) => a.hores - b.hores || a.nom.localeCompare(b.nom));
});
</script>
