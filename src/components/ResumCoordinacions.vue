<template>
 <div class="space-y-8">
 <div class="print-hide mb-4 flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div
 class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'"
 >
 <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
 {{ isConnected ? 'En línia' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">Actualitzat: {{ lastUpdate }}</div>
 </div>

 <section class="overflow-hidden card">
 <div class="border-b border-slate-300 bg-slate-200 px-6 py-4">
 <div class="flex items-center justify-between gap-4">
 <div>
 <h3 class="text-xl font-semibold text-slate-950">Coordinacions</h3>
 <p class="text-sm text-slate-700 mt-1">{{ coordinacions.length }} coordinacions</p>
 </div>
 <div class="text-right">
 <div class="text-3xl font-bold text-slate-950">{{ totalHoresCoordinacions }}h</div>
 <div class="text-sm text-slate-600">{{ coordinacions.length }} comissions</div>
 </div>
 </div>
 </div>

 <div v-if="coordinacions.length === 0" class="p-8 text-center text-slate-600 italic">
 Sense coordinacions.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Comissió</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Coordinador/a</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Membres</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr v-for="classe in coordinacions" :key="classe.id" class="hover:bg-slate-100">
 <td class="px-6 py-3 font-medium text-slate-950">{{ classe.materia }}</td>
 <td class="px-6 py-3 text-center font-semibold text-slate-950">{{ classe.hores }}h</td>
 <td class="px-6 py-3">
 <span v-if="classe.professorAssignat" class="text-slate-800">{{ classe.professorAssignat }}</span>
 <span v-else class="text-amber-700 font-medium italic">Sense coordinador/a</span>
 </td>
 <td class="px-6 py-3 text-slate-700">
 <div v-if="membresCoordinacio(classe).length" class="space-y-0.5">
 <div v-for="membre in membresCoordinacio(classe)" :key="membre">{{ membre }}</div>
 </div>
 <span v-else class="italic text-slate-400">—</span>
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

const coordinacions = computed(() =>
 classes.value
 .filter((c) => ['C', 'CO'].includes((c.tipus || '').toString().trim().toUpperCase()))
 .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''))
);

const totalHoresCoordinacions = computed(() =>
 coordinacions.value.reduce((total, c) => total + (Number(c.hores) || 0), 0)
);

function membresCoordinacio(classe) {
 return (classe.participants || []).filter(
 (nom) => nom && nom !== classe.professorAssignat
 );
}
</script>
