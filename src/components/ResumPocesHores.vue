<template>
 <div class="space-y-6">
 <div class="flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div
 class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'"
 >
 <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">
 Última actualització: {{ lastUpdate }}
 </div>
 </div>

 <div class="card">
 <div class="border-b border-slate-300 bg-slate-200 px-6 py-4 flex items-center justify-between">
 <div>
 <h3 class="text-lg font-semibold text-slate-950">
 Professors per sota de les hores recomanades
 </h3>
 <p class="text-sm text-slate-600 mt-1">
 {{ professorsPocesHores.length }} professors
 </p>
 </div>
 </div>

 <div v-if="professorsPocesHores.length === 0" class="p-8 text-center text-slate-600 italic">
 Tots els professors arriben a les hores recomanades per la seva jornada.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Professor</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Departament</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Objectiu</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores lectives</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Diferència</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="professor in professorsPocesHores"
 :key="professor.id"
 class="hover:bg-slate-100"
 >
 <td class="px-6 py-3 font-medium text-slate-950">
 {{ professor.nom }}
 </td>
 <td class="px-6 py-3 text-slate-700">
 {{ formatDepartamentsProfessor(professor) }}
 </td>
 <td class="px-6 py-3 text-center text-slate-700">
 {{ professor.objectiu }}h
 </td>
 <td class="px-6 py-3 text-center">
 <span class="px-2 py-1 rounded-full font-semibold text-sm"
 :class="professor.hores === 0
 ? 'bg-slate-100 text-slate-700'
 : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'"
 >
 {{ professor.hores }}h
 </span>
 </td>
 <td class="px-6 py-3 text-center text-red-800 font-medium">
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
import { comptarSDAssignacions } from '../utils/suportDivisible';
import { formatDepartamentsProfessor } from '../utils/departaments';

const { items: classes, isConnected: classesOk, lastUpdate } = useColSnapshot('classes');
const { items: professors, isConnected: profsOk } = useColSnapshot('professors');
const isConnected = computed(() => classesOk.value && profsOk.value);

const professorsPocesHores = computed(() => {
 return professors.value
 .map(p => {
 const objectiu = limitsHoresProfessor(p).ideal;
 const hores = calcularHoresLectives(classes.value, p.nom)
 + (Number(p.palicAssignades) || 0)
 + comptarSDAssignacions(p);
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
