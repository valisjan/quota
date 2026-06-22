<template>
 <div class="space-y-8">
 <!-- Connection indicator -->
 <div class="mb-4 flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'">
 <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">
 Última actualització: {{ lastUpdate }}
 </div>
 </div>

 <div 
 v-for="departament in departamentsOrdenats" 
 :key="departament" 
 class="overflow-hidden card"
 >
 <div class="border-b border-slate-300 bg-slate-200 px-6 py-4">
 <h3 class="text-xl font-semibold text-slate-950">{{ departament }}</h3>
 <div class="mt-1 space-y-1">
 <p class="text-sm text-slate-700">
 Total hores assignades: <span class="font-semibold">{{ calcularTotalHoresDepartament(departament) }}</span>
 </p>
 <p class="text-sm text-slate-700">
 Objectiu professorat:
 <span 
 class="font-semibold"
 :class="getCapacitatClass(departament)"
 >
 {{ formatCapacitatDepartament(departament) }}
 </span>
 </p>
 </div>
 </div>
 
 <div class="p-6">
 <div class="space-y-4">
 <div 
 v-for="classe in sortClasses(departamentsInfo[departament])" 
 :key="classe.id"
 class="flex justify-between items-center p-4 bg-slate-100 rounded-lg border border-slate-300"
 >
 <div>
 <div class="flex items-center gap-2 mb-1">
 <p class="font-medium text-slate-950">{{ classe.materia }}</p>
 <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)">
 {{ getTipusLabel(classe.tipus) }}
 </span>
 </div>
 <p class="text-sm text-slate-700">
 <span v-if="classe.curs || classe.grup">
 {{ classe.curs }} {{ classe.grup }}
 </span>
 <span v-else class="italic">
 Activitat de coordinació
 </span>
 </p>
 <p v-if="classe.professorAssignat" class="text-sm text-slate-700 mt-1">
 Prof: {{ classe.professorAssignat }}
 </p>
 </div>
 <div class="text-right">
 <p class="font-medium text-slate-950">
 {{ classe.hores }}h
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTipusBadgeClass, getTipusLabel } from '../utils/tipus';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { resumCapacitatProfessorat } from '../utils/horesProfessor';
import { professorPertanyDepartament } from '../utils/departaments';

const { items: classes, isConnected: classesOk, lastUpdate } = useCursCollectionSnapshot({ colName: 'classes' });
const { items: professors, isConnected: professorsOk } = useCursCollectionSnapshot({ colName: 'professors' });
const isConnected = computed(() => classesOk.value && professorsOk.value);

const departamentsInfo = computed(() => {
 const info = {};
 classes.value.forEach(classe => {
 if (!classe.departaments) return;
 classe.departaments.forEach(departament => {
 if (!info[departament]) {
 info[departament] = [];
 }
 info[departament].push(classe);
 });
 });
 return info;
});

const departamentsOrdenats = computed(() => {
 return Object.keys(departamentsInfo.value).sort();
});

function sortClasses(classes) {
 return [...classes].sort((a, b) => {
 // Primero las clases con curso/grupo
 const aHasGroup = a.curs || a.grup;
 const bHasGroup = b.curs || b.grup;
 
 if (aHasGroup && !bHasGroup) return -1;
 if (!aHasGroup && bHasGroup) return 1;
 
 // Si ambas tienen grupo o ambas no tienen grupo
 if (!a.curs && !b.curs) return a.materia.localeCompare(b.materia);
 if (!a.curs) return 1;
 if (!b.curs) return -1;
 if (a.curs !== b.curs) return a.curs.localeCompare(b.curs);
 if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
 return (a.grup || '').localeCompare(b.grup || '');
 });
}

function calcularTotalHoresDepartament(departament) {
 return departamentsInfo.value[departament].reduce((total, classe) => {
 return total + classe.hores;
 }, 0);
}

function capacitatDepartament(departament) {
 return resumCapacitatProfessorat(
 professors.value.filter((professor) => professorPertanyDepartament(professor, departament))
 );
}

function formatHores(value) {
 const number = Number(value) || 0;
 return Number.isInteger(number) ? number.toString() : number.toFixed(1);
}

function formatCapacitatDepartament(departament) {
 const capacitat = capacitatDepartament(departament);
 return `${formatHores(capacitat.ideal)}h / màxim ${formatHores(capacitat.maxim)}h`;
}

function getCapacitatClass(departament) {
 const totalHores = calcularTotalHoresDepartament(departament);
 const capacitat = capacitatDepartament(departament);
 if (totalHores > capacitat.maxim) return 'text-red-800';
 if (totalHores > capacitat.ideal) return 'text-amber-800 dark:text-yellow-400';
 return 'text-green-600';
}

</script>
