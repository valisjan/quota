<template>
 <div class="resum-grups sections space-y-5">
 <!-- Capçalera: filtre + botó -->
 <div class="print-hide flex justify-end">
 <button @click="imprimirGrups" class="btn-primary flex items-center gap-2 text-sm">
 Imprimir resum de grups
 </button>
 </div>

 <!-- Filtres per nivell -->
 <div class="app-toolbar print-hide flex w-fit flex-wrap items-center gap-1">
 <button
 v-for="filtre in filtres"
 :key="filtre.id"
 @click="filtreActiu = filtreActiu === filtre.id ? null : filtre.id"
 class="app-toolbar-button rounded px-3 py-1.5"
 :class="filtreActiu === filtre.id
 ? 'app-toolbar-button-active'
 : ''"
 >
 {{ filtre.nom }}
 </button>
 </div>

 <!-- VISTA PANTALLA: quadrícula de targetes (oculta en impressió) -->
 <div class="print-hide space-y-5">
 <section
 v-for="(classesPorGrup, curs) in classesAgrupadesPerCursFiltrades"
 :key="curs"
 class="overflow-hidden card"
 >
 <div class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
 <h3 class="text-base font-bold text-slate-950">{{ curs }}</h3>
 <span class="text-xs font-semibold text-slate-500">{{ Object.keys(classesPorGrup).length }} grups</span>
 </div>

 <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
 <article
 v-for="(classes, grup) in classesPorGrup"
 :key="grup"
 class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
 >
 <header class="px-3 pt-3">
 <div class="flex items-start justify-between gap-3">
 <div>
 <div class="flex items-center gap-1.5">
 <h4 class="text-sm font-bold text-slate-950">Grup {{ grup }}</h4>
 <span v-if="grupTeBordeRojo(classes)" class="text-rose-500 text-sm leading-none">&#9888;</span>
 </div>
 <p class="mt-0.5 text-xs font-medium" :class="totsAssignats(classes) ? 'text-emerald-700' : 'text-slate-500'">
 {{ resumPendentsGrup(classes) }}
 </p>
 </div>
 <div class="text-right">
 <p class="text-sm font-bold" :class="getHoresClass(classes)">
 {{ calcularHoresAssignades(classes) }} / {{ calcularTotalHoresGrup(classes) }}h
 </p>
 <p class="text-[11px] font-medium text-slate-500">assignades</p>
 </div>
 </div>
 <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
 <div
 class="h-full rounded-full transition-all"
 :class="barraHoresClass(classes)"
 :style="{ width: `${percentatgeAssignat(classes)}%` }"
 ></div>
 </div>
 </header>

 <div class="space-y-2 p-3">
 <template v-for="item in agruparClassesPerVista(classes)" :key="item.key">
 <section
 v-if="item.esGrupOptatives"
 class="overflow-hidden rounded-lg border bg-white"
 :class="itemTeAssignacionsPendents(item) ? 'border-slate-200 border-l-4 border-l-rose-300' : 'border-slate-200'"
 >
 <div class="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
 <span class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800/60">
 ✦ Optativa {{ item.tipus !== 'O' ? item.tipus : '' }} · {{ item.hores }}h
 </span>
 <span class="shrink-0 text-[11px] font-semibold text-slate-500">mateixa franja</span>
 </div>
 <div class="divide-y divide-slate-100">
 <div
 v-for="classe in item.classes"
 :key="classe.id"
 class="px-3 py-2 text-sm"
 :class="rowAssignacioClass(classe)"
 >
 <p class="font-semibold leading-snug text-slate-900">{{ formatMateriaVista(classe.materia) }}</p>
 <p class="mt-1 text-xs leading-snug" :class="classeAssignada(classe) ? 'text-slate-600' : 'font-semibold text-rose-600'">
 {{ professoratClasseText(classe) || '⚠ Sense professor' }}
 </p>
 </div>
 </div>
 </section>

 <section
 v-else-if="item.esGrupMateria"
 class="overflow-hidden rounded-lg border bg-white"
 :class="itemTeAssignacionsPendents(item) ? 'border-slate-200 border-l-4 border-l-amber-300' : 'border-slate-200'"
 >
 <div class="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2">
 <strong class="min-w-0 text-sm font-bold leading-snug text-slate-950">{{ formatMateriaVista(item.materia) }}</strong>
 <span class="shrink-0 text-xs font-bold text-slate-700">{{ item.hores }}h</span>
 </div>
 <div class="divide-y divide-slate-100">
 <div
 v-for="classe in item.classes"
 :key="classe.id"
 class="px-3 py-2"
 :class="rowAssignacioClass(classe)"
 >
 <div class="flex flex-wrap items-center gap-1.5">
 <span v-if="classe.tipus" :class="getTipusChipClass(classe.tipus)">{{ getTipusLabel(classe.tipus) }}</span>
 <span v-else class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600">🎓 Titular</span>
 <span v-if="classe.hores !== item.hores" class="text-[11px] font-semibold text-slate-500">{{ classe.hores }}h</span>
 <span v-if="!comptaPerGrup(classe)" class="text-[11px] font-medium text-slate-500">no compta grup</span>
 </div>
 <p class="mt-1 text-xs leading-snug" :class="classeAssignada(classe) ? 'text-slate-600' : 'font-semibold text-rose-600'">
 {{ professoratClasseText(classe) || '⚠ Sense professor' }}
 </p>
 </div>
 </div>
 </section>

 <section v-else class="rounded-lg border bg-white p-3" :class="getClasseStyle(item.classe)">
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <div class="flex min-w-0 flex-wrap items-center gap-1.5">
 <strong class="text-sm font-bold leading-snug text-slate-950">{{ formatMateriaVista(item.classe.materia) }}</strong>
 <span v-if="item.classe.tipus" :class="getTipusChipClass(item.classe.tipus)">{{ getTipusLabel(item.classe.tipus) }}</span>
 <span v-if="!comptaPerGrup(item.classe)" class="text-[11px] font-medium text-slate-500">no compta grup</span>
 </div>
 <p class="mt-1 text-xs leading-snug" :class="classeAssignada(item.classe) ? 'text-slate-600' : 'font-semibold text-rose-600'">
 {{ professoratClasseText(item.classe) || '⚠ Sense professor assignat' }}
 </p>
 </div>
 <span class="shrink-0 text-sm font-bold text-slate-700">{{ item.classe.hores }}h</span>
 </div>
 </section>
 </template>
 </div>
 </article>
 </div>
 </section>

 <!-- Activitats de coordinació sense grup -->
 <section v-if="coordinationActivities.length > 0" class="overflow-hidden card">
 <div class="border-b border-slate-200 bg-white px-5 py-3">
 <div class="flex flex-wrap items-center gap-2">
 <h3 class="text-base font-bold text-slate-950">Activitats de coordinació</h3>
 <span v-if="coordinationActivitiesSenseAssignar.length > 0" class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-800/60">
 {{ coordinationActivitiesSenseAssignar.length }} sense assignar
 </span>
 </div>
 <p class="mt-0.5 text-xs text-slate-600">Tutories, caps de departament, PALIC i altres activitats sense grup específic</p>
 </div>
 <div class="p-4">
 <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
 <article
 v-for="activity in sortCoordinationActivities(coordinationActivities)"
 :key="activity.id"
 class="rounded-lg border bg-white p-3"
 :class="!classeAssignada(activity) ? 'border-slate-200 border-l-4 border-l-rose-300' : 'border-slate-200'"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <div class="flex min-w-0 flex-wrap items-center gap-1.5">
 <strong class="text-sm font-bold leading-snug text-slate-950">{{ formatMateriaVista(activity.materia) }}</strong>
 <span v-if="activity.tipus" :class="getTipusChipClass(activity.tipus)">{{ getTipusLabel(activity.tipus) }}</span>
 </div>
 <p class="mt-1 text-xs leading-snug" :class="classeAssignada(activity) ? 'text-slate-600' : 'font-semibold text-rose-600'">
 {{ professoratClasseText(activity) || '⚠ Sense professor assignat' }}
 </p>
 <p v-if="activity.departaments?.[0]" class="mt-1 text-xs font-medium text-slate-500">{{ activity.departaments[0] }}</p>
 </div>
 <span class="shrink-0 text-xs font-bold text-slate-700">{{ activity.hores }}h</span>
 </div>
 </article>
 </div>
 </div>
 </section>
 </div><!-- /print-hide -->

 <!-- VISTA IMPRESSIÓ: taula compacta (oculta en pantalla) -->
 <div class="print-only resum-grups-print">
 <table class="resum-grups-print-table">
 <colgroup>
 <col style="width: 8%" />
 <col style="width: 38%" />
 <col style="width: 16%" />
 <col style="width: 8%" />
 <col style="width: 30%" />
 </colgroup>
 <thead>
 <tr>
 <th>Grup</th>
 <th>Matèria</th>
 <th>Tipus</th>
 <th>Hores</th>
 <th>Professor/a</th>
 </tr>
 </thead>
 <tbody>
 <template v-for="(classesPorGrup, curs) in classesAgrupadesPerCurs" :key="curs + '-p'">
 <tr>
 <td colspan="5" class="print-curs-sep">{{ curs }}</td>
 </tr>
 <template v-for="(classes, grup) in classesPorGrup" :key="grup + '-p'">
 <tr>
 <td colspan="5" class="print-grup-sep">
 Grup {{ grup }} · {{ calcularHoresAssignades(classes) }} / {{ calcularTotalHoresGrup(classes) }}h · {{ resumPendentsGrup(classes) }}
 </td>
 </tr>
 <template v-for="bloc in blocsPrint(classes)" :key="bloc.key">
 <tr
 v-for="(classe, index) in bloc.classes"
 :key="classe.id + '-p'"
 :class="{
 'print-materia-multi': bloc.classes.length > 1,
 'print-materia-start': index === 0,
 'print-materia-end': index === bloc.classes.length - 1,
 }"
 >
 <td v-if="index === 0" :rowspan="bloc.classes.length" :class="bloc.classes.length > 1 ? 'print-block-main' : ''">{{ grup }}</td>
 <td
 v-if="index === 0"
 :rowspan="bloc.classes.length"
 :class="[!bloc.assignada ? 'print-unassigned' : '', bloc.classes.length > 1 ? 'print-block-main print-materia-name' : '']"
 >
 {{ bloc.materia }}
 </td>
 <td>{{ tipusPrint(classe) }}</td>
 <td v-if="index === 0" :rowspan="bloc.classes.length" :class="bloc.classes.length > 1 ? 'print-block-main' : ''">{{ bloc.horesText }}</td>
 <td :class="!classeAssignada(classe) ? 'print-unassigned' : ''">
 {{ professoratClasseText(classe) || 'Sense assignar' }}
 </td>
 </tr>
 </template>
 </template>
 </template>
 <template v-if="coordinationActivities.length > 0">
 <tr>
 <td colspan="5" class="print-curs-sep">Activitats de coordinació i sense grup</td>
 </tr>
 <tr v-for="activity in sortCoordinationActivities(coordinationActivities)" :key="activity.id + '-p'">
 <td>—</td>
 <td :class="!classeAssignada(activity) ? 'print-unassigned' : ''">{{ formatMateriaVista(activity.materia) }}</td>
 <td>{{ tipusPrint(activity) }}</td>
 <td>{{ activity.hores }}h</td>
 <td :class="!classeAssignada(activity) ? 'print-unassigned' : ''">
 {{ professoratClasseText(activity) || 'Sense assignar' }}
 </td>
 </tr>
 </template>
 </tbody>
 </table>
 </div>
 </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import {
 getTipusLabel,
 clauFranjaOptativa,
 esAutodesdoble,
 esOptativa,
 normalitzarTipus,
} from '../utils/tipus';
import { E2E_AUTH_BYPASS, getE2ECollection } from '../services/e2e';

const cursStore = useCursStore();
const classes = ref([]);
const filtreActiu = ref(null);
let classesUnsubscribe = null;

const filtres = [
 { id: '1r', nom: '1r ESO' },
 { id: '2n', nom: '2n ESO' },
 { id: '3r', nom: '3r ESO' },
 { id: '4t', nom: '4t ESO' },
 { id: 'batx', nom: 'Batxillerat' },
 { id: 'fp', nom: 'FP' },
];

function getCursCategoria(curs) {
 const c = (curs || '').toUpperCase().trim();
 if (c.startsWith('1ESO') || c.startsWith('1R')) return '1r';
 if (c.startsWith('2ESO') || c.startsWith('2N')) return '2n';
 if (c.startsWith('3ESO') || c.startsWith('3R')) return '3r';
 if (c.startsWith('4ESO') || c.startsWith('4T')) return '4t';
 if (c.startsWith('1BAT') || c.startsWith('2BAT') || c.includes('BAT')) return 'batx';
 return 'fp';
}

const TIPUS_NO_COMPTEN_GRUP = ['D', 'F', 'PALIC', 'GP', 'C', 'CO'];


function professorsClasse(classe) {
 if (Array.isArray(classe.professors) && classe.professors.length > 0) {
 return classe.professors.filter(Boolean);
 }
 return [classe.professorAssignat].filter(Boolean);
}

function classeAssignada(classe) {
 const tipus = (classe.tipus || '').toUpperCase().trim();
 const assignats = professorsClasse(classe).length;
 if (tipus.startsWith('T')) return assignats >= 2;
 return assignats > 0;
}

function getAutodesdobleN(tipus) {
 const match = (tipus || '').toUpperCase().trim().match(/^A(\d+)$/);
 return match ? parseInt(match[1]) : 0;
}

function comptaPerGrup(classe) {
 const tipus = (classe.tipus || '').toUpperCase().trim();
 if (TIPUS_NO_COMPTEN_GRUP.includes(tipus)) return false;
 if (classe.materia?.startsWith('*')) return false;
 return true;
}

function calcularTotalHoresGrup(classesDelGrup) {
 const optativesVistes = new Set();
 const materiesMax = {};
 let total = 0;
 for (const classe of classesDelGrup) {
 const tipus = (classe.tipus || '').toUpperCase().trim();
 if (!comptaPerGrup(classe)) continue;
 if (esOptativa(tipus)) {
 const clauOptativa = clauFranjaOptativa(tipus);
 if (!optativesVistes.has(clauOptativa)) {
 optativesVistes.add(clauOptativa);
 total += classe.hores;
 }
 } else if (classe.materia) {
 if (materiesMax[classe.materia] === undefined || classe.hores > materiesMax[classe.materia]) {
 materiesMax[classe.materia] = classe.hores;
 }
 }
 }
 Object.values(materiesMax).forEach(h => { total += h; });
 return total;
}

function calcularHoresAssignades(classesDelGrup) {
 const optativesVistes = new Set();
 const materiesMax = {};
 let total = 0;
 for (const classe of classesDelGrup) {
 const tipus = (classe.tipus || '').toUpperCase().trim();
 if (!comptaPerGrup(classe)) continue;
 if (!classeAssignada(classe)) continue;
 if (esOptativa(tipus)) {
 const clauOptativa = clauFranjaOptativa(tipus);
 if (!optativesVistes.has(clauOptativa)) {
 optativesVistes.add(clauOptativa);
 total += classe.hores;
 }
 } else if (classe.materia) {
 if (materiesMax[classe.materia] === undefined || classe.hores > materiesMax[classe.materia]) {
 materiesMax[classe.materia] = classe.hores;
 }
 }
 }
 Object.values(materiesMax).forEach(h => { total += h; });
 return total;
}

function totsAssignats(classesDelGrup) {
 const total = calcularTotalHoresGrup(classesDelGrup);
 return total > 0 && calcularHoresAssignades(classesDelGrup) >= total;
}

function getHoresClass(classesDelGrup) {
 const total = calcularTotalHoresGrup(classesDelGrup);
 const assignades = calcularHoresAssignades(classesDelGrup);
 if (total > 0 && assignades >= total) return 'text-emerald-700';
 if (assignades === 0) return 'text-rose-600';
 return 'text-amber-800';
}

function classesPendentsGrup(classesDelGrup) {
 return classesDelGrup.filter(classe => !classeAssignada(classe)).length;
}

function resumPendentsGrup(classesDelGrup) {
 const pendents = classesPendentsGrup(classesDelGrup);
 if (pendents === 0) return 'Tot assignat';
 return `${pendents} ${pendents === 1 ? 'pendent' : 'pendents'}`;
}

function percentatgeAssignat(classesDelGrup) {
 const total = calcularTotalHoresGrup(classesDelGrup);
 if (total <= 0) return 0;
 return Math.min(100, Math.round((calcularHoresAssignades(classesDelGrup) / total) * 100));
}

function barraHoresClass(classesDelGrup) {
 const total = calcularTotalHoresGrup(classesDelGrup);
 const assignades = calcularHoresAssignades(classesDelGrup);
 if (total > 0 && assignades >= total) return 'bg-emerald-400';
 if (assignades === 0) return 'bg-rose-400';
 return 'bg-amber-400';
}

function itemTeAssignacionsPendents(item) {
 const llista = item.esGrupOptatives || item.esGrupMateria ? item.classes : [item.classe];
 return llista.some(classe => !classeAssignada(classe));
}

function rowAssignacioClass(classe) {
 return classeAssignada(classe) ? 'bg-white' : 'bg-slate-50';
}

function professoratClasseText(classe) {
 return professorsClasse(classe).join(', ');
}

function formatMateriaVista(value) {
 const text = (value || '').toString().trim();
 if (!text) return '';
 const letters = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || [];
 if (letters.length > 3 && text === text.toLocaleUpperCase('ca-ES')) {
 const lower = text.toLocaleLowerCase('ca-ES');
 return lower.charAt(0).toLocaleUpperCase('ca-ES') + lower.slice(1);
 }
 return text;
}

function getTipusChipClass(tipus) {
 const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1';
 const normal = normalitzarTipus(tipus);
 if (normal === 'S') return `${base} bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/60`;
 if (normal === 'F') return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-200 dark:ring-indigo-800/60`;
 if (normal === 'D' || normal === 'CD') return `${base} bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-800/60`;
 if (normal === 'C' || normal === 'CO') return `${base} bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-200 dark:ring-violet-800/60`;
 if (normal === 'GP') return `${base} bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-800/60`;
 if (normal === 'PALIC') return `${base} bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-200 dark:ring-orange-800/60`;
 if (normal.startsWith('O') || normal.startsWith('T')) return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800/60`;
 return `${base} bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600`;
}

function agruparClassesPerVista(classesDelGrup) {
 const resultat = [];
 const tipusOptativesVists = new Set();
 const materiesVistes = new Set();

 const classesOrdenades = [...classesDelGrup].sort((a, b) => {
 const aOpt = esOptativa((a.tipus || '').toUpperCase().trim());
 const bOpt = esOptativa((b.tipus || '').toUpperCase().trim());
 if (aOpt !== bOpt) return aOpt ? 1 : -1;
 if (aOpt && bOpt) {
 const ta = (a.tipus || '').toUpperCase().trim();
 const tb = (b.tipus || '').toUpperCase().trim();
 return ta.localeCompare(tb);
 }
 return (a.materia || '').localeCompare(b.materia || '');
 });

 classesOrdenades.forEach(classe => {
 const tipus = (classe.tipus || '').toUpperCase().trim();
 if (esOptativa(tipus)) {
 const clauOptativa = clauFranjaOptativa(tipus);
 if (!tipusOptativesVists.has(clauOptativa)) {
 tipusOptativesVists.add(clauOptativa);
 const classesDelTipus = classesDelGrup.filter(c => {
 const tipusClasse = (c.tipus || '').toUpperCase().trim();
 return esOptativa(tipusClasse) && clauFranjaOptativa(tipusClasse) === clauOptativa;
 });
 resultat.push({
 key: `optativa-${clauOptativa}`,
 esGrupOptatives: true,
 esGrupMateria: false,
 tipus: clauOptativa,
 hores: classe.hores,
 classes: classesDelTipus,
 });
 }
 } else if (classe.materia && !materiesVistes.has(classe.materia)) {
 materiesVistes.add(classe.materia);
 const classesDeMateria = classesDelGrup.filter(
 c => c.materia === classe.materia && !esOptativa((c.tipus || '').toUpperCase().trim())
 );
 if (classesDeMateria.length > 1) {
 const horesPerGrup = classesDeMateria.filter(c => comptaPerGrup(c)).map(c => c.hores);
 const horesMax = horesPerGrup.length > 0
 ? Math.max(...horesPerGrup)
 : Math.max(...classesDeMateria.map(c => c.hores));
 const classesOrdenadesMat = [...classesDeMateria].sort((a, b) => {
 return (comptaPerGrup(a) ? 0 : 1) - (comptaPerGrup(b) ? 0 : 1);
 });
 resultat.push({
 key: `materia-${classe.materia}`,
 esGrupOptatives: false,
 esGrupMateria: true,
 materia: classe.materia,
 hores: horesMax,
 classes: classesOrdenadesMat,
 });
 } else {
 resultat.push({ key: classe.id, esGrupOptatives: false, esGrupMateria: false, classe });
 }
 }
 });

 return resultat;
}

function getClasseStyle(classe) {
 if (!classeAssignada(classe)) return 'border-slate-200 border-l-4 border-l-rose-300 bg-white';
 if (!comptaPerGrup(classe)) return 'border-slate-200 bg-slate-50 opacity-80';
 return 'border-slate-200 bg-white';
}

function grupTeBordeRojo(classes) {
 return classes.some(c => !classeAssignada(c));
}

function sortCoordinationActivities(activities) {
 return [...activities].sort((a, b) => {
 if (a.departaments?.[0] !== b.departaments?.[0]) {
 return (a.departaments?.[0] || '').localeCompare(b.departaments?.[0] || '');
 }
 return a.materia.localeCompare(b.materia);
 });
}

function classesOrdenadesPrint(classesDelGrup) {
 return [...classesDelGrup].sort((a, b) => {
 const aOpt = esOptativa(normalitzarTipus(a.tipus));
 const bOpt = esOptativa(normalitzarTipus(b.tipus));
 if (aOpt !== bOpt) return aOpt ? 1 : -1;
 const materia = (a.materia || '').localeCompare(b.materia || '', 'ca');
 if (materia !== 0) return materia;
 const tipusOrdre = ordreTipusPrint(a) - ordreTipusPrint(b);
 if (tipusOrdre !== 0) return tipusOrdre;
 return normalitzarTipus(a.tipus).localeCompare(normalitzarTipus(b.tipus), 'ca');
 });
}

function blocsPrint(classesDelGrup) {
 const blocs = [];
 const blocsPerClau = new Map();
 for (const classe of classesOrdenadesPrint(classesDelGrup)) {
 const key = clauBlocPrint(classe);
 let bloc = blocsPerClau.get(key);
 if (!bloc) {
 bloc = {
 key,
 materia: formatMateriaVista(classe.materia),
 classes: [],
 };
 blocsPerClau.set(key, bloc);
 blocs.push(bloc);
 }
 bloc.classes.push(classe);
 }

 return blocs.map(bloc => {
 const classesBloc = [...bloc.classes].sort((a, b) => {
 const ordre = ordreTipusPrint(a) - ordreTipusPrint(b);
 if (ordre !== 0) return ordre;
 return normalitzarTipus(a.tipus).localeCompare(normalitzarTipus(b.tipus), 'ca');
 });
 return {
 ...bloc,
 classes: classesBloc,
 horesText: horesBlocPrint(classesBloc),
 assignada: classesBloc.every(classeAssignada),
 };
 });
}

function clauBlocPrint(classe) {
 const materia = (classe.materia || '').toString().trim();
 if (!materia) return `classe-${classe.id}`;
 const tipus = normalitzarTipus(classe.tipus);
 const franja = esOptativa(tipus) ? clauFranjaOptativa(tipus) : 'materia';
 return `${franja}::${materia.toLocaleLowerCase('ca-ES')}`;
}

function ordreTipusPrint(classe) {
 const tipus = normalitzarTipus(classe.tipus);
 if (!tipus) return 0;
 if (tipus === 'S') return 1;
 if (tipus === 'D' || tipus === 'CD') return 2;
 if (tipus === 'F') return 3;
 if (esOptativa(tipus)) return 4;
 return 5;
}

function horesBlocPrint(classesBloc) {
 const horesQueCompten = classesBloc.filter(comptaPerGrup).map(c => Number(c.hores) || 0);
 const hores = horesQueCompten.length > 0
 ? horesQueCompten
 : classesBloc.map(c => Number(c.hores) || 0);
 return `${Math.max(...hores)}h`;
}

function tipusPrint(classe) {
 return classe.tipus ? getTipusLabel(classe.tipus) : 'Titular';
}

const coordinationActivities = computed(() => {
 return classes.value.filter(c =>
 !['C', 'CO'].includes((c.tipus || '').toString().toUpperCase().trim()) &&
 (!c.curs || c.curs === '') &&
 (!c.grup || c.grup === '') &&
 c.materia && c.materia !== ''
 );
});

const coordinationActivitiesSenseAssignar = computed(() => {
 return coordinationActivities.value.filter(a => !a.professorAssignat || a.professorAssignat.trim() === '');
});

const classesAgrupadesPerCurs = computed(() => {
 const agrupades = {};
 classes.value.forEach(classe => {
 if (!classe.curs || !classe.grup) return;
 const grups = classe.grup.split('+').map(g => g.trim()).filter(Boolean);
 const numGrups = grups.length;
 const tipusNorm = (classe.tipus || '').toUpperCase().trim();
 const esOpt = esOptativa(tipusNorm);
 const horesBase = (numGrups > 1 && comptaPerGrup(classe) && !esOpt) ? Math.round(classe.hores / numGrups) : classe.hores;
 const horesPerGrup = esAutodesdoble(tipusNorm) ? Math.max(0, horesBase - getAutodesdobleN(tipusNorm)) : horesBase;
 grups.forEach(grupNet => {
 if (!agrupades[classe.curs]) agrupades[classe.curs] = {};
 if (!agrupades[classe.curs][grupNet]) agrupades[classe.curs][grupNet] = [];
 agrupades[classe.curs][grupNet].push({ ...classe, grup: grupNet, hores: horesPerGrup });
 });
 });
 return Object.keys(agrupades).sort().reduce((acc, curs) => {
 acc[curs] = Object.keys(agrupades[curs]).sort().reduce((ga, grup) => {
 ga[grup] = agrupades[curs][grup];
 return ga;
 }, {});
 return acc;
 }, {});
});

const classesAgrupadesPerCursFiltrades = computed(() => {
 if (!filtreActiu.value) return classesAgrupadesPerCurs.value;
 return Object.fromEntries(
 Object.entries(classesAgrupadesPerCurs.value).filter(
 ([curs]) => getCursCategoria(curs) === filtreActiu.value
 )
 );
});

function setupRealtimeListeners() {
 cleanupListeners();
 if (E2E_AUTH_BYPASS) {
 classes.value = getE2ECollection('classes');
 return;
 }
 classesUnsubscribe = onSnapshot(
 query(cursStore.col('classes')),
 snapshot => { classes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); },
 );
}

function cleanupListeners() {
 if (classesUnsubscribe) { classesUnsubscribe(); classesUnsubscribe = null; }
}

function imprimirGrups() {
 window.print();
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(() => cleanupListeners());
</script>
