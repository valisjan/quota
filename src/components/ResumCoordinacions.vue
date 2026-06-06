<template>
 <div class="space-y-8">
 <div class="mb-4 flex items-center justify-between">
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
 <h3 class="text-xl font-semibold text-slate-950">
 Coordinacions i comissions
 </h3>
 <p class="text-sm text-slate-700 mt-1">
 Registres importats amb tipus C.
 </p>
 </div>
 <div class="text-right">
 <div class="text-3xl font-bold text-slate-950">
 {{ totalHoresCoordinacions }}h
 </div>
 <div class="text-sm text-slate-600">
 {{ coordinacions.length }} registres
 </div>
 </div>
 </div>
 </div>

 <div
 v-if="coordinacions.length === 0"
 class="p-8 text-center text-slate-600 italic"
 >
 No hi ha coordinacions importades amb tipus C.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Comissió</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores coordinació</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Coordinador</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Membres</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="classe in coordinacions"
 :key="classe.id"
 class="hover:bg-slate-100"
 >
 <td class="px-6 py-3 font-medium text-slate-950">
 {{ classe.materia }}
 </td>
 <td class="px-6 py-3 text-center font-semibold text-slate-950">
 {{ classe.hores }}h
 </td>
 <td class="px-6 py-3">
 <span v-if="classe.professorAssignat" class="text-slate-800">
 {{ classe.professorAssignat }}
 </span>
 <span v-else class="text-red-800 font-medium">
 Sense coordinador
 </span>
 </td>
 <td class="px-6 py-3 text-slate-700">
 <div v-if="membresCoordinacio(classe).length" class="space-y-1">
 <div
 v-for="membre in membresCoordinacio(classe)"
 :key="membre"
 >
 {{ membre }}
 </div>
 </div>
 <span v-else class="italic text-slate-500">
 Sense membres
 </span>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </section>

 <section
 class="overflow-hidden card"
 >
 <div
 class="border-b border-slate-300 bg-slate-200 px-6 py-4"
 >
 <div class="flex items-center justify-between gap-4">
 <div>
 <h3 class="text-xl font-semibold text-slate-950">
 Altres hores sense assignació clara
 </h3>
 <p class="text-sm text-slate-700 mt-1">
 Registres importats que no semblen classe ordinària, coordinació, GP ni PALIC.
 </p>
 </div>
 <div class="text-right">
 <div class="text-3xl font-bold text-slate-950">
 {{ totalHoresAltres }}h
 </div>
 <div class="text-sm text-slate-600">
 {{ altresHores.length }} registres
 </div>
 </div>
 </div>
 </div>

 <div
 v-if="altresHores.length === 0"
 class="p-8 text-center text-slate-600 italic"
 >
 No hi ha altres hores pendents de classificar.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Departament</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Matèria</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Tipus</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Curs / Grup</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Motiu</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="classe in altresHores"
 :key="classe.id"
 class="hover:bg-slate-100"
 >
 <td class="px-6 py-3 text-slate-700">
 {{ classe.departament || classe.departaments?.[0] || 'Sense departament' }}
 </td>
 <td class="px-6 py-3 font-medium text-slate-950">
 {{ classe.materia || 'Sense matèria' }}
 </td>
 <td class="px-6 py-3 text-slate-700">
 {{ classe.tipus || 'Buit' }}
 </td>
 <td class="px-6 py-3 text-slate-700">
 <span v-if="classe.curs || classe.grup">{{ classe.curs }} {{ classe.grup }}</span>
 <span v-else class="italic text-slate-500">Sense grup</span>
 </td>
 <td class="px-6 py-3 text-center font-semibold text-slate-950">
 {{ classe.hores }}h
 </td>
 <td class="px-6 py-3 text-red-800">
 {{ motiuAltresHores(classe) }}
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

const TIPUS_CONEGUTS_SENSE_GRUP = ['C', 'CO', 'GP', 'PALIC'];
const TIPUS_CONEGUTS_AMB_GRUP = ['D', 'CD', 'S', 'F', 'A'];

function normalitzarTipus(tipus) {
 return (tipus || '').toString().trim().toUpperCase();
}

function normalitzarText(text) {
 return (text || '')
 .toString()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .replace(/^\*/, '')
 .trim()
 .toLowerCase();
}

function esOptativa(tipus) {
 const normal = normalitzarTipus(tipus);
 return normal.startsWith('O') || normal.startsWith('T');
}

function esCoordinacio(tipus) {
 const normal = normalitzarTipus(tipus);
 return normal === 'C' || normal === 'CO';
}

function esTutoria(classe) {
 return normalitzarText(classe.materia).includes('tutoria');
}

function esCapDepartament(classe) {
 const materia = normalitzarText(classe.materia);
 return materia.includes('cap') && materia.includes('departament');
}

function teGrupClasse(classe) {
 return Boolean(
 (classe.curs || '').toString().trim() &&
 (classe.grup || '').toString().trim()
 );
}

function teDepartament(classe) {
 return Boolean(
 (classe.departament || '').toString().trim() || classe.departaments?.[0]
 );
}


const coordinacions = computed(() => {
 return classes.value
 .filter((classe) => esCoordinacio(classe.tipus))
 .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));
});

const altresHores = computed(() => {
 return classes.value
 .filter((classe) => {
 const tipus = normalitzarTipus(classe.tipus);

 if (esCoordinacio(tipus)) return false;
 if (esTutoria(classe)) return false;
 if (esCapDepartament(classe)) return false;
 if (!teDepartament(classe)) return true;
 if (!classe.materia || classe.hores <= 0) return true;
 if (!teGrupClasse(classe)) {
 return !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus);
 }
 if (!tipus || esOptativa(tipus)) return false;
 if (TIPUS_CONEGUTS_AMB_GRUP.includes(tipus)) return false;
 return !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus);
 })
 .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));
});

const totalHoresCoordinacions = computed(() => sumarHores(coordinacions.value));
const totalHoresAltres = computed(() => sumarHores(altresHores.value));

function sumarHores(llista) {
 return llista.reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
}

function membresCoordinacio(classe) {
 return (classe.participants || []).filter(
 (nom) => nom && nom !== classe.professorAssignat
 );
}

function motiuAltresHores(classe) {
 const tipus = normalitzarTipus(classe.tipus);
 if (!teDepartament(classe)) return 'Falta departament';
 if (!classe.materia) return 'Falta matèria';
 if (!classe.hores || classe.hores <= 0) return 'Hores buides o zero';
 if (!teGrupClasse(classe) && !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus)) {
 return 'Sense curs/grup i tipus no classificat';
 }
 return `Tipus no classificat: ${classe.tipus || 'buit'}`;
}

</script>
