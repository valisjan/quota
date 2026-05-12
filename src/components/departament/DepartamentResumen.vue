<template>
  <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-xl text-gray-900 dark:text-white">{{ departament }}</h3>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalHores }}h</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ professorsNecessaris }} professors
          </div>
        </div>
        <button
          @click="$emit('imprimir')"
          class="btn-primary flex items-center gap-2"
          aria-label="Imprimir repartiment del departament"
        >
          <span aria-hidden="true">🖨️</span> Imprimir
        </button>
      </div>
    </div>

    <!-- Lista compacta de materias -->
    <div class="grid gap-2">
      <div v-for="classe in classes" :key="classe.id"
           class="flex flex-wrap items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-700">
        <div class="w-20 shrink-0 font-bold text-gray-900 dark:text-white">
          {{ classe.curs }} {{ classe.grup }}
        </div>
        <div class="min-w-0 flex-1">
          <span class="font-medium text-gray-900 dark:text-white">{{ classe.materia }}</span>
          <span v-if="classe.tipus"
                class="ml-2 px-1.5 py-0.5 text-xs rounded"
                :class="getTipusBadgeClass(classe.tipus)">
            {{ classe.tipus }}
          </span>
        </div>
        <div class="shrink-0 font-bold text-gray-900 dark:text-white">
          {{ classe.hores }}h
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  departament: {
    type: String,
    required: true
  },
  classes: {
    type: Array,
    default: () => []
  },
  totalHores: {
    type: Number,
    default: 0
  },
  professorsNecessaris: {
    type: String,
    default: '0'
  }
});

defineEmits(['imprimir']);

function getTipusBadgeClass(tipus) {
  const classMap = {
    'O': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    'D': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100',
    'S': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
    'A': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100',
    'F': 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100',
    'GP': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100',
    'PALIC': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'
  };
  return classMap[tipus] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
}
</script>
