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
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Caps de departament
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ capsDepartament.length }} registres
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ totalHores }}h
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Total hores
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="capsDepartament.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400 italic"
      >
        No hi ha caps de departament importats.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Departament</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Matèria</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Cap</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Hores</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="cap in capsDepartament"
              :key="cap.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                {{ cap.departament || cap.departaments?.[0] || 'Sense departament' }}
              </td>
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
                {{ cap.materia }}
              </td>
              <td class="px-6 py-3">
                <span v-if="cap.professorAssignat" class="text-gray-700 dark:text-gray-300">
                  {{ cap.professorAssignat }}
                </span>
                <span v-else class="text-red-600 dark:text-red-400 font-medium">
                  Sense cap assignat
                </span>
              </td>
              <td class="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                {{ cap.hores }}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useColSnapshot } from '../composables/useColSnapshot';

const { items: classes, isConnected, lastUpdate } = useColSnapshot('classes');

function normalitzarText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\*/, '')
    .trim()
    .toLowerCase();
}

function esCapDepartament(classe) {
  const materia = normalitzarText(classe.materia);
  return materia.includes('cap') && materia.includes('departament');
}

const capsDepartament = computed(() => {
  return classes.value
    .filter(esCapDepartament)
    .sort((a, b) => {
      const dep = (a.departament || a.departaments?.[0] || '').localeCompare(
        b.departament || b.departaments?.[0] || ''
      );
      if (dep !== 0) return dep;
      return (a.professorAssignat || '').localeCompare(b.professorAssignat || '');
    });
});

const totalHores = computed(() => {
  return capsDepartament.value.reduce(
    (total, cap) => total + (Number(cap.hores) || 0),
    0
  );
});

</script>
