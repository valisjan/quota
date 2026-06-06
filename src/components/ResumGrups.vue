<template>
 <div class="resum-grups sections space-y-5">
 <!-- Capçalera: filtre + botó -->
 <div class="print-hide flex justify-end">
 <button @click="imprimirGrups" class="btn-primary flex items-center gap-2 text-sm">
 Imprimir resum de grups
 </button>
 </div>

 <!-- Filtres per nivell -->
 <div class="print-hide flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1 w-fit">
 <button
 v-for="filtre in filtres"
 :key="filtre.id"
 @click="filtreActiu = filtreActiu === filtre.id ? null : filtre.id"
 class="rounded px-3 py-1.5 text-sm font-semibold transition"
 :class="filtreActiu === filtre.id
 ? 'bg-white text-primary shadow-sm'
 : 'text-slate-700 hover:bg-white/70 hover:text-slate-950'"
 >
 {{ filtre.nom }}
 </button>
 </div>

 <!-- Seccions per curs -->
 <div
 v-for="(classesPorGrup, curs) in classesAgrupadesPerCursFiltrades"
 :key="curs"
 class="overflow-hidden card"
 >
 <div class="border-b border-slate-300 bg-slate-200 px-5 py-3">
 <h3 class="text-base font-bold text-slate-950">{{ curs }}</h3>
 </div>

 <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
 <div
 v-for="(classes, grup) in classesPorGrup"
 :key="grup"
 class="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm"
 >
 <div class="flex items-center justify-between border-b border-slate-300 bg-slate-200 px-3 py-2">
 <div class="flex items-center gap-1.5">
 <h4 class="text-sm font-bold text-slate-950">Grup {{ grup }}</h4>
 <span v-if="grupTeBordeRojo(classes)" class="text-rose-500 text-sm leading-none">&#9888;</span>
 </div>
 <div class="text-sm font-semibold" :class="getHoresClass(classes)">
 {{ calcularHoresAssignades(classes) }}h / {{ calcularTotalHoresGrup(classes) }}h
 <span v-if="totsAssignats(classes)">&#10004;</span>
 <span v-else>&#9888;</span>
 </div>
 </div>

 <div class="space-y-2 p-3">
 <template v-for="item in agruparClassesPerVista(classes)" :key="item.key">

 <!-- Bloc d'optatives agrupades -->
 <div
 v-if="item.esGrupOptatives"
 class="rounded-md border p-2.5"
 :class="item.classes.some(c => !c.professorAssignat)
 ? 'border-rose-300 bg-rose-50'
 : 'border-slate-200 bg-white'"
 >
 <div class="mb-1.5 flex items-center justify-between">
 <span class="badge badge-green">
 ✦ Optativa {{ item.tipus !== 'O' ? item.tipus : '' }} · {{ item.hores }}h
 </span>
 <span class="text-xs text-slate-600">mateixa franja</span>
 </div>
 <div class="space-y-1">
 <div
 v-for="classe in item.classes"
 :key="classe.id"
 class="flex items-center justify-between rounded px-2 py-1 text-sm"
 :class="!classe.professorAssignat ? 'bg-rose-100' : 'bg-white'"
 >
 <span class="font-medium text-slate-800">{{ classe.materia }}</span>
 <span v-if="classe.professorAssignat" class="text-slate-600">{{ classe.professorAssignat }}</span>
 <span v-else class="font-medium text-rose-600">&#9888; Sense prof.</span>
 </div>
 </div>
 </div>

 <!-- Matèria amb múltiples professors (normal + D/S/F) -->
 <div
 v-else-if="item.esGrupMateria"
 class="rounded-md border p-2.5"
 :class="item.classes.some(c => !c.professorAssignat)
 ? 'border-amber-400 bg-amber-100'
 : 'border-slate-200 bg-white'"
 >
 <div class="mb-1.5 flex items-center justify-between">
 <strong class="text-sm text-slate-900">{{ item.materia }}</strong>
 <span class="text-xs font-semibold text-slate-700">{{ item.hores }}h</span>
 </div>
 <div class="space-y-1">
 <div
 v-for="classe in item.classes"
 :key="classe.id"
 class="flex items-center justify-between rounded px-2 py-1 text-sm"
 :class="!classe.professorAssignat ? 'bg-amber-200' : 'bg-white'"
 >
 <div class="flex items-center gap-1.5">
 <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)" class="inline-flex items-center gap-1">
 {{ getTipusLabel(classe.tipus) }}
 </span>
 <span v-else class="badge badge-gray inline-flex items-center gap-1">🎓 Titular</span>
 <span v-if="classe.hores !== item.hores" class="text-slate-500">({{ classe.hores }}h)</span>
 </div>
 <span v-if="classe.professorAssignat" class="text-slate-600">{{ classe.professorAssignat }}</span>
 <span v-else class="font-medium text-rose-600">&#9888; Sense prof.</span>
 </div>
 </div>
 </div>

 <!-- Classe normal -->
 <div
 v-else
 class="rounded-md border p-2.5"
 :class="getClasseStyle(item.classe)"
 >
 <div class="flex items-start justify-between gap-2">
 <div class="flex min-w-0 flex-wrap items-center gap-1.5">
 <strong class="text-sm text-slate-900">{{ item.classe.materia }}</strong>
 <span v-if="item.classe.tipus" :class="getTipusBadgeClass(item.classe.tipus)" class="inline-flex items-center gap-1 text-xs">
 {{ getTipusLabel(item.classe.tipus) }}
 </span>
 <span v-if="!comptaPerGrup(item.classe)" class="text-xs text-slate-500">(no compta grup)</span>
 </div>
 <span class="shrink-0 text-sm font-semibold text-slate-700">{{ item.classe.hores }}h</span>
 </div>
 <div class="mt-1 text-sm">
 <span v-if="item.classe.professorAssignat" class="text-slate-700">{{ item.classe.professorAssignat }}</span>
 <span v-else class="font-medium text-rose-600">&#9888; Sense professor assignat</span>
 </div>
 </div>

 </template>
 </div>
 </div>
 </div>
 </div>

 <!-- Activitats de coordinació sense grup -->
 <div
 v-if="coordinationActivities.length > 0"
 class="overflow-hidden card"
 >
 <div class="border-b border-slate-300 bg-slate-200 px-5 py-3">
 <div class="flex items-center gap-2">
 <h3 class="text-base font-bold text-slate-950">Activitats de coordinació</h3>
 <span v-if="coordinationActivitiesSenseAssignar.length > 0" class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
 {{ coordinationActivitiesSenseAssignar.length }} sense assignar
 </span>
 </div>
 <p class="mt-0.5 text-xs text-slate-600">Tutories, caps de departament, PALIC i altres activitats sense grup específic</p>
 </div>
 <div class="p-4">
 <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
 <div
 v-for="activity in sortCoordinationActivities(coordinationActivities)"
 :key="activity.id"
 class="rounded-lg border p-3"
 :class="!activity.professorAssignat
 ? 'border-rose-300 bg-rose-50'
 : 'border-slate-200 bg-slate-50'"
 >
 <div class="flex items-center justify-between gap-2">
 <div class="flex min-w-0 flex-wrap items-center gap-1.5">
 <strong class="text-sm text-slate-900">{{ activity.materia }}</strong>
 <span v-if="activity.tipus" :class="getTipusBadgeClass(activity.tipus)" class="inline-flex items-center gap-1 text-xs">
 {{ getTipusLabel(activity.tipus) }}
 </span>
 </div>
 <span class="shrink-0 text-xs font-semibold text-slate-700">{{ activity.hores }}h</span>
 </div>
 <div class="mt-1 text-xs">
 <span v-if="activity.professorAssignat" class="text-slate-700">{{ activity.professorAssignat }}</span>
 <span v-else class="font-medium text-rose-600">&#9888; Sense professor assignat</span>
 </div>
 <div v-if="activity.departaments?.[0]" class="mt-1 text-xs text-slate-500">
 {{ activity.departaments[0] }}
 </div>
 </div>
 </div>
 </div>
 </div>

 <!-- Contingut d'impressió (ocult) -->
 <div id="print-grups-content" class="hidden">
 <div class="print-page">
 <div class="print-header">
 <h1>Resum de Grups i Assignacions</h1>
 <p>Data: {{ new Date().toLocaleDateString('ca-ES') }}</p>
 </div>
 <div v-for="(classesPorGrup, curs) in classesAgrupadesPerCurs" :key="curs" class="print-curs">
 <div class="curs-header"><h2>{{ curs }}</h2></div>
 <div class="grups-grid">
 <div v-for="(classes, grup) in classesPorGrup" :key="grup" class="print-grup">
 <div class="grup-header">
 <h3>Grup {{ grup }}</h3>
 <span class="total-hours" :class="{ 'hours-warning': !totsAssignats(classes) }">
 {{ calcularHoresAssignades(classes) }}h / {{ calcularTotalHoresGrup(classes) }}h
 </span>
 </div>
 <div class="classes-list">
 <template v-for="item in agruparClassesPerVista(classes)" :key="item.key">
 <div v-if="item.esGrupOptatives" class="class-item optativa-group">
 <span class="class-name">Optativa {{ item.tipus !== 'O' ? item.tipus : '' }} ({{ item.hores }}h)</span>
 <div v-for="c in item.classes" :key="c.id" style="padding-left:12px;font-size:12px">
 {{ c.materia }} - {{ c.professorAssignat || 'Sense assignar' }}
 </div>
 </div>
 <div v-else-if="item.esGrupMateria" class="class-item optativa-group" style="background:#f0f4ff;border-color:#90a4d4">
 <span class="class-name">{{ item.materia }} ({{ item.hores }}h)</span>
 <div v-for="c in item.classes" :key="c.id" style="padding-left:12px;font-size:12px">
 {{ c.tipus || 'Titular' }}<span v-if="c.hores !== item.hores"> ({{ c.hores }}h)</span>
 - {{ c.professorAssignat || 'Sense assignar' }}
 </div>
 </div>
 <div v-else class="class-item" :class="{ 'class-unassigned': !item.classe.professorAssignat }">
 <span class="class-name">{{ item.classe.materia }}</span>
 <span class="class-professor" :class="{ unassigned: !item.classe.professorAssignat }">
 {{ item.classe.professorAssignat || 'Sense assignar' }}
 </span>
 <span class="class-hours">{{ item.classe.hores }}h</span>
 </div>
 </template>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import {
 getTipusBadgeClass,
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
 if (!classeAssignada(classe)) return 'border-rose-300 bg-rose-50';
 if (!comptaPerGrup(classe)) return 'border-slate-300 bg-slate-100 opacity-70';
 return 'border-slate-300 bg-white';
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
 const horesBase = (numGrups > 1 && !esOpt) ? Math.round(classe.hores / numGrups) : classe.hores;
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
 const printWindow = window.open('', '_blank');
 const printContent = document.getElementById('print-grups-content').innerHTML;
 const printHTML = `<!DOCTYPE html><html><head><title>Resum de Grups</title>
<style>
body{font-family:Arial,sans-serif;line-height:1.4;color:#333;padding:20px}
.print-header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:15px}
.print-curs{margin-bottom:30px}
.curs-header h2{background:#f0f0f0;padding:10px;border-radius:5px}
.grups-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.print-grup{border:1px solid #ddd;border-radius:5px;overflow:hidden;page-break-inside:avoid}
.grup-header{display:flex;justify-content:space-between;padding:10px;background:#f8f9fa;border-bottom:1px solid #ddd}
.grup-header h3{margin:0}
.total-hours{padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;background:#e8f5e8;color:#2e7d32}
.hours-warning{background:#ffebee;color:#d32f2f}
.classes-list{padding:10px}
.class-item{display:grid;grid-template-columns:2fr 2fr 1fr;gap:8px;padding:5px 0;border-bottom:1px solid #eee}
.class-item:last-child{border-bottom:none}
.class-unassigned{background:#ffebee;border:1px solid #d32f2f;border-radius:4px;padding:5px}
.optativa-group{background:#e8f5e8;border:1px solid #a5d6a7;border-radius:4px;padding:8px;margin:4px 0}
.unassigned{color:#d32f2f;font-weight:bold}
@media print{.grups-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>${printContent}</body></html>`;
 printWindow.document.write(printHTML);
 printWindow.document.close();
 printWindow.onload = () => { printWindow.print(); printWindow.close(); };
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(() => cleanupListeners());
</script>
