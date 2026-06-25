<template>
 <div class="space-y-5">
 <div class="card p-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <h3 class="text-xl font-bold text-slate-900">
 Tracabilitat per professor
 </h3>
 <p class="mt-1 text-base text-slate-700">
 Vista completa de càrrega, responsabilitats, preferències i avisos.
 </p>
 </div>
 <div
 class="flex items-center gap-2 rounded-full px-3 py-1 text-sm"
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'"
 >
 <span class="h-2 w-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
 {{ isConnected ? 'Dades en directe' : 'Desconnectat' }}
 </div>
 </div>

 <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
 <input
 v-model="cerca"
 type="text"
 class="form-input"
 placeholder="Cerca professor, matèria, grup..."
 />
 <select v-model="departamentFiltre" class="form-input">
 <option value="">Tots els departaments</option>
 <option v-for="departament in departaments" :key="departament" :value="departament">
 {{ departament }}
 </option>
 </select>
 <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 ">
 <input v-model="nomesAvisos" type="checkbox" class="h-4 w-4 rounded text-primary" />
 Només avisos
 </label>
 </div>
 </div>

 <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
 <div
 v-for="card in resumCards"
 :key="card.label"
 class="rounded-lg border p-4 shadow-sm"
 :class="card.class"
 >
 <p class="text-sm font-semibold">{{ card.label }}</p>
 <p class="mt-2 text-4xl font-bold">{{ card.value }}</p>
 <p class="mt-1 text-sm opacity-80">{{ card.detail }}</p>
 </div>
 </div>

 <div class="space-y-4">
 <article
 v-for="item in professorsFiltrats"
 :key="item.professor.id"
 class="overflow-hidden card"
 :class="item.estat.border"
 >
 <div class="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between" :class="item.estat.header">
 <div>
 <div class="flex flex-wrap items-center gap-2">
 <h4 class="text-xl font-bold text-slate-900">
 {{ item.professor.nom }}
 </h4>
 <span class="rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold text-slate-700 ">
 {{ formatDepartamentsProfessor(item.professor) || 'Sense departament' }}
 </span>
 <span v-if="item.professor.major55" class="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
 &gt;55
 </span>
 <span class="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
 {{ textJornada(item.professor) }}
 </span>
 </div>
 <p class="mt-2 text-sm text-slate-700">
 {{ item.estat.text }}
 </p>
 </div>
 <div class="grid grid-cols-5 gap-2 text-center sm:min-w-[32rem]">
 <div class="rounded-lg bg-white/80 px-3 py-2 ">
 <p class="text-xs font-medium uppercase text-slate-600">Lectives</p>
 <p class="text-xl font-bold text-slate-900">{{ item.lectives }}</p>
 </div>
 <div class="rounded-lg bg-white/80 px-3 py-2 ">
 <p class="text-xs font-medium uppercase text-slate-600">GP</p>
 <p class="text-xl font-bold text-slate-900">{{ item.gp }}</p>
 </div>
 <div class="rounded-lg bg-white/80 px-3 py-2 ">
 <p class="text-xs font-medium uppercase text-slate-600">PALIC</p>
 <p class="text-xl font-bold text-slate-900">{{ item.palic }}</p>
 </div>
 <div class="rounded-lg bg-white/80 px-3 py-2 ">
 <p class="text-xs font-medium uppercase text-slate-600">Suport divisible</p>
 <p class="text-xl font-bold text-slate-900">{{ item.sd }}</p>
 </div>
 <div class="rounded-lg bg-white/80 px-3 py-2 ">
 <p class="text-xs font-medium uppercase text-slate-600">Desdoblament divisible</p>
 <p class="text-xl font-bold text-slate-900">{{ item.dd }}</p>
 </div>
 </div>
 </div>

 <div class="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
 <div class="space-y-4">
 <section>
 <h5 class="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
 Classes i activitats
 </h5>
 <div v-if="item.classes.length === 0" class="rounded-lg border border-slate-200 p-4 text-sm italic text-slate-600 ">
 Sense classes assignades.
 </div>
 <div v-else class="overflow-hidden rounded-lg border border-slate-300">
 <table class="w-full text-sm">
 <thead class="bg-slate-50 ">
 <tr>
 <th class="px-3 py-2 text-left font-semibold text-slate-700">Matèria</th>
 <th class="px-3 py-2 text-left font-semibold text-slate-700">Grup</th>
 <th class="px-3 py-2 text-left font-semibold text-slate-700">Tipus</th>
 <th class="px-3 py-2 text-right font-semibold text-slate-700">Hores</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr v-for="classe in item.classes" :key="classe.id">
 <td class="px-3 py-2 font-medium text-slate-900">{{ classe.materia }}</td>
 <td class="px-3 py-2 text-slate-700">{{ formatGrup(classe) }}</td>
 <td class="px-3 py-2 text-slate-700">{{ getTipusText(classe.tipus) }}</td>
 <td class="px-3 py-2 text-right font-bold text-slate-900">{{ classe.hores }}h</td>
 </tr>
 </tbody>
 </table>
 </div>
 </section>

 <section v-if="item.tutories.length || item.coordinador.length || item.comissions.length">
 <h5 class="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
 Responsabilitats
 </h5>
 <div class="grid gap-2 md:grid-cols-3">
 <div v-if="item.tutories.length" class="rounded-lg bg-blue-50 p-3/30">
 <p class="text-xs font-bold uppercase text-blue-800">Tutories</p>
 <p class="mt-1 text-sm text-blue-900">{{ item.tutories.map(formatGrup).join(', ') }}</p>
 </div>
 <div v-if="item.coordinador.length" class="rounded-lg bg-violet-50 p-3/30">
 <p class="text-xs font-bold uppercase text-violet-800">Coordinador</p>
 <p class="mt-1 text-sm text-violet-900">{{ item.coordinador.map((c) => c.materia).join(', ') }}</p>
 </div>
 <div v-if="item.comissions.length" class="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
 <p class="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-200">Comissions</p>
 <p class="mt-1 text-sm text-emerald-900 dark:text-emerald-100">{{ item.comissions.map((c) => c.materia).join(', ') }}</p>
 </div>
 </div>
 </section>
 </div>

 <aside class="space-y-3">
 <div class="rounded-lg border border-slate-200 p-4 ">
 <h5 class="text-sm font-bold uppercase tracking-wide text-slate-600">
 Preferència horària
 </h5>
 <p class="mt-2 font-bold text-slate-950">
 {{ getPreferenciaText(item.professor.preferencia) || 'Sense preferència' }}
 </p>
 <p v-if="item.professor.motiuAllegat" class="mt-2 text-sm text-slate-700">
 {{ item.professor.motiuAllegat }}
 </p>
 </div>

 <div v-if="item.professor.comentaris" class="rounded-lg border border-slate-200 p-4 ">
 <h5 class="text-sm font-bold uppercase tracking-wide text-slate-600">
 Comentaris
 </h5>
 <p class="mt-2 text-sm text-slate-700">{{ item.professor.comentaris }}</p>
 </div>

 <div v-if="item.avisos.length" class="rounded-lg border border-amber-200 bg-amber-50 p-4 ">
 <h5 class="text-sm font-bold uppercase tracking-wide text-amber-800">
 Avisos
 </h5>
 <ul class="mt-2 space-y-1 text-sm text-amber-900">
 <li v-for="avis in item.avisos" :key="avis">{{ avis }}</li>
 </ul>
 </div>
 </aside>
 </div>
 </article>

 <div v-if="professorsFiltrats.length === 0" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 ">
 No hi ha professors amb aquests filtres.
 </div>
 </div>
 </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useColSnapshot } from '../composables/useColSnapshot';
import { getTipusText } from '../utils/tipus';
import { limitsHoresProfessor, textJornada, horesComputablesClasse, classeAssignadaA } from '../utils/horesProfessor';
import { comptarDDAssignacions, comptarSDAssignacions } from '../utils/suportDivisible';
import { departamentsProfessor, formatDepartamentsProfessor, professorPertanyDepartament } from '../utils/departaments';

const { items: classes, isConnected } = useColSnapshot('classes');
const { items: professors } = useColSnapshot('professors');
const cerca = ref('');
const departamentFiltre = ref('');
const nomesAvisos = ref(false);

const departaments = computed(() =>
 [...new Set(professors.value.flatMap((p) => departamentsProfessor(p)).filter(Boolean))].sort()
);

const professorsInfo = computed(() =>
 professors.value
 .map((professor) => construirInfoProfessor(professor))
 .sort(
 (a, b) =>
 formatDepartamentsProfessor(a.professor).localeCompare(formatDepartamentsProfessor(b.professor), 'ca') ||
 (a.professor.nom || '').localeCompare(b.professor.nom || '')
 )
);

const professorsFiltrats = computed(() => {
 const terme = normalitzar(cerca.value);
 return professorsInfo.value.filter((item) => {
 if (departamentFiltre.value && !professorPertanyDepartament(item.professor, departamentFiltre.value)) return false;
 if (nomesAvisos.value && item.avisos.length === 0) return false;
 if (!terme) return true;
 return normalitzar([
 item.professor.nom,
 formatDepartamentsProfessor(item.professor),
 ...item.classes.map((classe) => `${classe.materia} ${classe.curs} ${classe.grup}`),
 ...item.coordinador.map((classe) => classe.materia),
 ...item.comissions.map((classe) => classe.materia),
 ].join(' ')).includes(terme);
 });
});

const resumCards = computed(() => {
 const avisos = professorsInfo.value.filter((item) => item.avisos.length > 0).length;
 const sobreLimit = professorsInfo.value.filter((item) => item.lectives > item.limits.maxim).length;
 const baixos = professorsInfo.value.filter((item) => item.lectives < item.limits.ideal).length;
 return [
 {
 label: 'Professors',
 value: professorsInfo.value.length,
 detail: 'en total',
 class: 'border-slate-300 bg-slate-50 text-slate-950',
 },
 {
 label: 'Amb avisos',
 value: avisos,
 detail: 'requereixen revisió',
 class: 'border-amber-300 bg-amber-100 text-amber-950',
 },
 {
 label: 'Sobre el màxim',
 value: sobreLimit,
 detail: 'passen el límit',
 class: 'border-red-300 bg-red-100 text-red-950',
 },
 {
 label: 'Per sota',
 value: baixos,
 detail: 'sota objectiu',
 class: 'border-blue-200 bg-blue-100 text-blue-950 /30',
 },
 ];
});

function construirInfoProfessor(professor) {
 const assignades = classes.value.filter((classe) => classeAssignadaA(classe, professor.nom));
 const palicAssignades = Number(professor.palicAssignades || 0) || sumarTipus(assignades, 'PALIC');
 const sd = comptarSDAssignacions(professor);
 const dd = comptarDDAssignacions(professor);
 const lectives = assignades
 .filter((classe) => !['GP', 'PALIC', 'SD', 'DD', 'C', 'CO'].includes(normalitzarTipus(classe.tipus)))
 .reduce((total, classe) => total + horesComputablesClasse(classe), 0) + palicAssignades + sd + dd;
 const gp = Number(professor.gpAssignades || 0) || sumarTipus(assignades, 'GP');
 const palic = palicAssignades;
 const limits = limitsHoresProfessor(professor);
 const coordinador = classes.value.filter(
 (classe) => ['C', 'CO'].includes(normalitzarTipus(classe.tipus)) && classe.professorAssignat === professor.nom
 );
 const comissions = classes.value.filter(
 (classe) => normalitzarTipus(classe.tipus) === 'C' && classe.participants?.includes(professor.nom)
 );
 const tutories = assignades.filter((classe) => esTutoria(classe) && !classe.materia?.startsWith('*'));
 const avisos = calcularAvisos(professor, lectives, limits, assignades, tutories);

 return {
 professor,
 classes: sortClasses(assignades.filter((classe) => !['C', 'CO'].includes(normalitzarTipus(classe.tipus)))),
 lectives,
 gp,
 palic,
 sd,
 dd,
 limits,
 coordinador,
 comissions,
 tutories,
 avisos,
 estat: estatProfessor(lectives, limits),
 };
}

function calcularAvisos(professor, lectives, limits, assignades, tutories) {
 const avisos = [];
 if (lectives < limits.ideal) avisos.push(`Per sota de l'objectiu (${lectives}/${limits.ideal}h).`);
 if (lectives > limits.maxim) avisos.push(`Supera el màxim (${lectives}/${limits.maxim}h).`);
 if (professor.preferencia && !professor.motiuAllegat) avisos.push('Té preferència horària sense motiu al·legat.');
 if (assignades.length === 0) avisos.push('No té cap classe o activitat assignada.');
 if (tutories.length > 1) avisos.push(`Té ${tutories.length} tutories assignades.`);
 return avisos;
}

function estatProfessor(lectives, limits) {
 if (lectives > limits.maxim) {
 return {
 text: `Supera el màxim de ${limits.maxim}h per ${limits.label}.`,
 border: 'border-red-300 ',
 header: 'bg-red-50/25',
 };
 }
 if (lectives > limits.ideal) {
 return {
 text: `Per sobre de l'objectiu de ${limits.ideal}h, dins el màxim.`,
 border: 'border-amber-300 ',
 header: 'bg-amber-50 dark:bg-amber-950/25',
 };
 }
 if (lectives === limits.ideal) {
 return {
 text: `Quadrat a ${limits.ideal}h.`,
 border: 'border-green-300 dark:border-green-800',
 header: 'bg-green-50/25',
 };
 }
 return {
 text: `Per sota de l'objectiu de ${limits.ideal}h.`,
 border: 'border-blue-300 ',
 header: 'bg-blue-50/25',
 };
}


function sumarTipus(llista, tipus) {
 return llista
 .filter((classe) => normalitzarTipus(classe.tipus) === tipus)
 .reduce((total, classe) => total + Number(classe.hores || 0), 0);
}

function normalitzarTipus(tipus) {
 return (tipus || '').toString().trim().toUpperCase();
}

function normalitzar(text) {
 return (text || '')
 .toString()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLowerCase();
}

function esTutoria(classe) {
 return normalitzar(classe.materia).includes('tutoria');
}

function formatGrup(classe) {
 return `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup';
}

function getPreferenciaText(preferencia) {
 const labels = {
 pronto: 'Entrar prest',
 tarde: 'Entrar tard',
 };
 return labels[preferencia] || '';
}

function sortClasses(llista) {
 return [...llista].sort((a, b) => {
 if ((a.curs || '') !== (b.curs || '')) return (a.curs || '').localeCompare(b.curs || '');
 if ((a.grup || '') !== (b.grup || '')) return (a.grup || '').localeCompare(b.grup || '');
 return (a.materia || '').localeCompare(b.materia || '');
 });
}

</script>
