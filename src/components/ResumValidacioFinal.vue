<template>
 <div class="space-y-6">
 <div class="app-card print-hide flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 class="text-3xl font-bold text-text-main">
 Validació final
 </h2>
 <p class="mt-1 text-base text-text-secondary">
 Revisió de la distribució abans de donar-la per tancada.
 </p>
 </div>
 <div class="flex flex-wrap gap-2 text-sm">
 <span
 class="app-chip px-3 py-1.5 font-semibold"
 :class="isConnected ? 'app-chip-success' : 'app-chip-danger'"
 >
 {{ isConnected ? 'Dades en directe' : 'Desconnectat' }}
 </span>
 <span class="app-chip px-3 py-1.5 font-medium">
 Actualitzat: {{ lastUpdate }}
 </span>
 </div>
 </div>

 <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
 <div
 v-for="card in cards"
 :key="card.label"
 class="metric-card p-4"
 :class="card.class"
 >
 <p class="text-sm font-semibold">{{ card.label }}</p>
 <p class="mt-2 text-4xl font-bold">{{ card.value }}</p>
 <p class="mt-1 text-sm opacity-80">{{ card.detail }}</p>
 </div>
 </div>

 <div class="app-card overflow-hidden">
 <div class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-700 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <p class="text-sm font-bold uppercase tracking-wide text-primary">Untis</p>
 <h3 class="mt-1 text-2xl font-bold text-text-main">Llest per exportar a Untis</h3>
 <p class="mt-1 max-w-3xl text-sm text-text-secondary">
 Checklist global abans de generar fitxers: dades importades, hores de grup, assignacions, blocs especials i codis.
 </p>
 </div>
 <div class="min-w-[220px] rounded-lg border p-4" :class="estatUntis.cardClass">
 <p class="text-sm font-semibold" :class="estatUntis.labelClass">{{ estatUntis.label }}</p>
 <p class="mt-1 text-3xl font-bold" :class="estatUntis.valueClass">{{ preparacioUntis.bloquejos }}</p>
 <p class="text-xs font-medium" :class="estatUntis.labelClass">
 bloquejos · {{ preparacioUntis.avisos }} avisos
 </p>
 </div>
 </div>

 <div class="p-5">
 <div class="mb-5">
 <div class="flex items-center justify-between text-xs font-semibold text-text-secondary">
 <span>{{ preparacioUntis.completats }} de {{ preparacioUntis.total }} blocs correctes</span>
 <span>{{ percentatgeUntis }}%</span>
 </div>
 <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
 <div class="h-full rounded-full transition-all" :class="estatUntis.progressClass" :style="{ width: `${percentatgeUntis}%` }"></div>
 </div>
 </div>

 <div class="grid gap-3 xl:grid-cols-2">
 <article
 v-for="check in checksUntis"
 :key="check.id"
 class="rounded-lg border p-4"
 :class="checkCardClass(check)"
 >
 <div class="flex items-start justify-between gap-3">
 <div>
 <h4 class="font-bold text-text-main">{{ check.title }}</h4>
 <p class="mt-1 text-sm text-text-secondary">{{ check.description }}</p>
 </div>
 <span class="shrink-0 rounded-md px-2.5 py-1 text-xs font-bold" :class="checkBadgeClass(check)">
 {{ checkStatusLabel(check) }}
 </span>
 </div>

 <div v-if="check.items.length" class="mt-3 space-y-2">
 <div
 v-for="item in check.items.slice(0, 3)"
 :key="item.key"
 class="rounded-md bg-white/70 px-3 py-2 text-sm dark:bg-gray-950/40"
 >
 <div class="font-semibold text-text-main">{{ item.title }}</div>
 <div class="mt-0.5 text-xs text-text-secondary">{{ item.detail }}</div>
 <div v-if="item.context" class="mt-0.5 text-xs font-medium text-text-secondary">{{ item.context }}</div>
 </div>
 <p v-if="check.items.length > 3" class="text-xs font-semibold text-text-secondary">
 + {{ check.items.length - 3 }} incidències més
 </p>
 </div>
 <p v-else class="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
 Correcte.
 </p>

 <router-link
 v-if="check.actionTo && check.items.length"
 :to="check.actionTo"
 class="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-800"
 >
 {{ check.actionLabel }}
 </router-link>
 </article>
 </div>
 </div>
 </div>

 <div class="app-card p-5">
 <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h3 class="text-xl font-bold text-text-main">
 Estat general
 </h3>
 <p class="mt-1 text-sm text-text-secondary">
 {{ resumEstat }}
 </p>
 </div>
 <div
 class="px-4 py-2 text-sm font-bold"
 :class="estatFinal.class"
 >
 {{ estatFinal.text }}
 </div>
 </div>
 </div>

 <section
 v-for="bloc in blocsVisibles"
 :key="bloc.id"
 class="overflow-hidden card"
 :class="bloc.borderClass"
 >
 <button
 class="print-keep-button flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
 :class="bloc.headerClass"
 @click="toggleBloc(bloc.id)"
 >
 <div>
 <h3 class="text-lg font-bold">{{ bloc.title }}</h3>
 <p class="mt-1 text-sm opacity-80">{{ bloc.description }}</p>
 </div>
 <div class="flex items-center gap-3">
 <span class="app-chip px-3 py-1 text-sm font-bold">
 {{ bloc.items.length }}
 </span>
 <span class="text-lg">{{ blocsOberts[bloc.id] ? '-' : '+' }}</span>
 </div>
 </button>

 <div v-show="blocsOberts[bloc.id]" class="print-force-open divide-y divide-slate-200">
 <div
 v-for="item in bloc.items"
 :key="item.key"
 class="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]"
 >
 <div>
 <p class="font-bold text-text-main">
 {{ item.title }}
 </p>
 <p class="mt-1 text-sm text-text-secondary">
 {{ item.detail }}
 </p>
 </div>
 <div class="text-sm font-medium text-text-secondary lg:text-right">
 {{ item.context }}
 </div>
 </div>
 </div>
 </section>

 <div
 v-if="senseIncidencies"
 class="app-card p-6 text-center"
 >
 <p class="text-xl font-bold text-text-main">Tot sembla a punt</p>
 <p class="mt-2 text-sm text-text-secondary">
 Tot en ordre. Res per revisar.
 </p>
 </div>
 </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { calcularValidacioFinal } from '../services/validacioFinal';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';

const { items: classes, isConnected: classesOk, lastUpdate } = useCursCollectionSnapshot({ colName: 'classes' });
const { items: professors, isConnected: profsOk } = useCursCollectionSnapshot({ colName: 'professors' });
const { items: departaments, isConnected: deptsOk } = useCursCollectionSnapshot({ colName: 'departaments' });
const isConnected = computed(() => classesOk.value && profsOk.value && deptsOk.value);

const blocsOberts = reactive({
 critiques: true,
 professorat: true,
 organitzacio: true,
 dades: false,
});

const validacio = computed(() =>
 calcularValidacioFinal({
 classes: classes.value,
 professors: professors.value,
 departaments: departaments.value,
 })
);

const critiques = computed(() => validacio.value.critiques);
const avisosOrganitzacio = computed(() => validacio.value.avisosOrganitzacio);
const avisosProfessorat = computed(() => validacio.value.avisosProfessorat);
const critiquesProfessorat = computed(() => validacio.value.critiquesProfessorat);
const dadesProblematiques = computed(() => validacio.value.dadesProblematiques);
const incidenciesProfessorat = computed(() => validacio.value.incidenciesProfessorat);
const classesSenseAssignar = computed(() => validacio.value.classesSenseAssignar);
const preparacioUntis = computed(() => validacio.value.preparacioUntis);
const checksUntis = computed(() => preparacioUntis.value.checks || []);
const percentatgeUntis = computed(() => {
 const total = preparacioUntis.value.total || 1;
 return Math.round((preparacioUntis.value.completats / total) * 100);
});

const estatUntis = computed(() => {
 if (preparacioUntis.value.bloquejos > 0) {
 return {
 label: 'No exportar encara',
 cardClass: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20',
 labelClass: 'text-rose-800 dark:text-rose-200',
 valueClass: 'text-rose-700 dark:text-rose-300',
 progressClass: 'bg-rose-500',
 };
 }
 if (preparacioUntis.value.avisos > 0) {
 return {
 label: 'Exportable amb avisos',
 cardClass: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20',
 labelClass: 'text-amber-800 dark:text-amber-200',
 valueClass: 'text-amber-700 dark:text-amber-300',
 progressClass: 'bg-amber-500',
 };
 }
 return {
 label: 'A punt per exportar',
 cardClass: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20',
 labelClass: 'text-emerald-800 dark:text-emerald-200',
 valueClass: 'text-emerald-700 dark:text-emerald-300',
 progressClass: 'bg-emerald-500',
 };
});

const blocs = computed(() => [
 {
 id: 'critiques',
 title: 'Incidències crítiques',
 description: "S'haurien de resoldre abans de tancar la distribució.",
 items: [...critiques.value, ...critiquesProfessorat.value],
 borderClass: 'border-red-200 ',
 headerClass: 'app-card-header-danger text-text-main',
 },
 {
 id: 'professorat',
 title: 'Avisos de professorat',
 description: 'Professors per sota de les hores recomanades.',
 items: avisosProfessorat.value,
 borderClass: 'border-amber-200 ',
 headerClass: 'app-card-header-warning text-text-main',
 },
 {
 id: 'organitzacio',
 title: "Avisos d'organització",
 description: 'Tutories emparellades, tancaments i coherència de la distribució.',
 items: avisosOrganitzacio.value,
 borderClass: 'border-blue-200 ',
 headerClass: 'app-card-header text-text-main',
 },
 {
 id: 'dades',
 title: 'Dades a revisar',
 description: 'Files amb camps buits o tipus no classificats.',
 items: dadesProblematiques.value,
 borderClass: 'border-slate-300',
 headerClass: 'app-card-header text-text-main',
 },
]);

const blocsVisibles = computed(() => blocs.value.filter((bloc) => bloc.items.length > 0));

const senseIncidencies = computed(() =>
 blocs.value.every((bloc) => bloc.items.length === 0)
);

const cards = computed(() => [
 {
 label: 'Crítiques',
 value: critiques.value.length + critiquesProfessorat.value.length,
 detail: 'bloquegen el tancament',
 class: 'app-stat-tile-danger',
 },
 {
 label: 'Avisos',
 value: avisosProfessorat.value.length + avisosOrganitzacio.value.length,
 detail: 'convé revisar',
 class: 'app-stat-tile-warning',
 },
 {
 label: 'Classes',
 value: classes.value.length,
 detail: `${classesSenseAssignar.value.length} sense assignar`,
 class: 'app-stat-tile-primary',
 },
 {
 label: 'Professors',
 value: professors.value.length,
 detail: `${incidenciesProfessorat.value.length} fora de rang`,
 class: 'app-stat-tile-success',
 },
]);

const estatFinal = computed(() => {
 if (critiques.value.length + critiquesProfessorat.value.length > 0) {
 return {
 text: 'No tancar encara',
 class: 'app-chip app-chip-danger',
 };
 }
 if (avisosProfessorat.value.length || avisosOrganitzacio.value.length || dadesProblematiques.value.length) {
 return {
 text: 'Revisable',
 class: 'app-chip app-chip-warning',
 };
 }
 return {
 text: 'A punt per tancar',
 class: 'app-chip app-chip-success',
 };
});

const resumEstat = computed(() => {
 const totalCritiques = critiques.value.length + critiquesProfessorat.value.length;
 const totalAvisos = avisosProfessorat.value.length + avisosOrganitzacio.value.length;
 if (totalCritiques > 0) return `${totalCritiques} ${totalCritiques === 1 ? 'incidència crítica' : 'incidències crítiques'}.`;
 if (totalAvisos > 0) return `${totalAvisos} ${totalAvisos === 1 ? 'avís pendent' : 'avisos pendents'}.`;
 if (dadesProblematiques.value.length > 0) return `${dadesProblematiques.value.length} ${dadesProblematiques.value.length === 1 ? 'fila' : 'files'} a revisar.`;
 return 'Cap incidència.';
});

function toggleBloc(id) {
 blocsOberts[id] = !blocsOberts[id];
}

function checkStatusLabel(check) {
 if (check.status === 'ok') return 'OK';
 if (check.status === 'warning') return `${check.count} avisos`;
 return `${check.count} bloquejos`;
}

function checkBadgeClass(check) {
 if (check.status === 'ok') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
 if (check.status === 'warning') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
 return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';
}

function checkCardClass(check) {
 if (check.status === 'ok') return 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/10';
 if (check.status === 'warning') return 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/10';
 return 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/10';
}

</script>
