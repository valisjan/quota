<template>
 <div class="bg-white p-6 rounded-lg shadow mb-6">
 <div class="flex justify-between items-center mb-4">
 <h3 class="font-bold text-xl text-slate-950">{{ departament }}</h3>
 <div class="flex items-center gap-4">
 <div class="text-right">
 <div class="text-3xl font-bold text-slate-950">{{ totalHores }}h</div>
 <div class="text-sm text-slate-700">
 {{ professorsNecessaris }} professors
 </div>
 </div>
 <button
 @click="$emit('imprimir')"
 class="btn-primary flex items-center gap-2"
 aria-label="Imprimir distribució del departament"
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
 class="ml-2"
 :class="getTipusBadgeClass(classe.tipus)">
 {{ getTipusLabel(classe.tipus) }}
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
import { getTipusBadgeClass, getTipusLabel } from '../../utils/tipus';

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

</script>
