<template>
 <div class="space-y-6">
 <div class="print-hide flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div
 class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
 :class="
 isConnected
 ? 'bg-green-200 text-green-900'
 : 'bg-red-200 text-red-900'
 "
 >
 <div
 class="w-2 h-2 rounded-full"
 :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
 ></div>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">
 Última actualització: {{ lastUpdate }}
 </div>
 </div>

 <section
 class="overflow-hidden card"
 >
 <div
 class="border-b border-slate-300 bg-slate-200 px-6 py-4"
 >
 <div class="flex items-center justify-between gap-4">
 <div>
 <h3 class="text-lg font-semibold text-slate-950">
 Caps de departament
 </h3>
 <p class="text-sm text-slate-600 mt-1">
 {{ capsDepartament.length }} registres
 </p>
 </div>
 <div class="text-right">
 <div class="text-3xl font-bold text-slate-950">
 {{ totalHores }}h
 </div>
 <div class="text-sm text-slate-600">
 Total hores
 </div>
 </div>
 </div>
 </div>

 <div
 v-if="capsDepartament.length === 0"
 class="p-8 text-center text-slate-600 italic"
 >
 No hi ha caps de departament importats.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Departament</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Matèria</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Cap</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="cap in capsDepartament"
 :key="cap.id"
 class="hover:bg-slate-100"
 >
 <td class="px-6 py-3 text-slate-700">
 {{ cap.departament || cap.departaments?.[0] || 'Sense departament' }}
 </td>
 <td class="px-6 py-3 font-medium text-slate-950">
 {{ cap.materia }}
 </td>
 <td class="px-6 py-3">
 <span v-if="cap.professorAssignat" class="text-slate-800">
 {{ cap.professorAssignat }}
 </span>
 <span v-else class="text-red-800 font-medium">
 Sense cap assignat
 </span>
 </td>
 <td class="px-6 py-3 text-center font-semibold text-slate-950">
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
