<template>
 <div class="space-y-6">
 <div class="app-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
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
 class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
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

 <div v-if="blocsOberts[bloc.id]" class="divide-y divide-slate-200">
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
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { calcularValidacioFinal } from '../services/validacioFinal';

const cursStore = useCursStore();

const classes = ref([]);
const professors = ref([]);
const departaments = ref([]);
const isConnected = ref(true);
const lastUpdate = ref(formatData(new Date()));
const blocsOberts = reactive({
 critiques: true,
 professorat: true,
 organitzacio: true,
 dades: false,
});

let classesUnsubscribe = null;
let professorsUnsubscribe = null;
let departamentsUnsubscribe = null;

function formatData(data) {
 return data.toLocaleString('ca-ES', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
}

function updateLastUpdate() {
 lastUpdate.value = formatData(new Date());
}

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

function setupRealtimeListeners() {
 cleanupListeners();
 classesUnsubscribe = onSnapshot(
 query(cursStore.col('classes')),
 (snapshot) => {
 classes.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
 updateLastUpdate();
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );

 professorsUnsubscribe = onSnapshot(
 query(cursStore.col('professors')),
 (snapshot) => {
 professors.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
 updateLastUpdate();
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );

 departamentsUnsubscribe = onSnapshot(
 query(cursStore.col('departaments')),
 (snapshot) => {
 departaments.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
 updateLastUpdate();
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );
}

function cleanupListeners() {
 classesUnsubscribe?.();
 professorsUnsubscribe?.();
 departamentsUnsubscribe?.();
 classesUnsubscribe = null;
 professorsUnsubscribe = null;
 departamentsUnsubscribe = null;
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(cleanupListeners);
</script>
