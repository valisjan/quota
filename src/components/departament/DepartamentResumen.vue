<template>
 <div class="bg-white p-6 rounded-lg shadow mb-6">
 <div class="flex justify-between items-center mb-4">
 <h3 class="font-bold text-xl text-slate-950">{{ departament }}</h3>
 <div class="flex items-center gap-4">
 <div class="text-right">
 <div class="text-primaryxl font-bold text-slate-950">{{ totalHores }}h</div>
 <div class="text-sm text-slate-700">
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
 class="flex flex-wrap items-center gap-2 p-2 rounded bg-slate-100 ">
 <div class="w-20 shrink-0 font-bold text-slate-950">
 {{ classe.curs }} {{ classe.grup }}
 </div>
 <div class="min-w-0 flex-1">
 <span class="font-medium text-slate-950">{{ classe.materia }}</span>
 <span v-if="classe.tipus"
 class="ml-2 px-1.5 py-0.5 text-xs rounded"
 :class="getTipusBadgeClass(classe.tipus)">
 {{ classe.tipus }}
 </span>
 </div>
 <div class="shrink-0 font-bold text-slate-950">
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
 'O': 'bg-green-200 text-green-900',
 'D': 'bg-blue-200 text-blue-900',
 'S': 'bg-yellow-100 dark:bg-yellow-900 text-amber-900 dark:text-yellow-100',
 'A': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100',
 'F': 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100',
 'GP': 'bg-red-200 text-red-900',
 'PALIC': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'
 };
 return classMap[tipus] || 'bg-slate-100 text-slate-900';
}
</script>
