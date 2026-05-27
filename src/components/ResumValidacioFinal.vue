<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
          Validació final
        </h2>
        <p class="mt-1 text-base text-slate-600 dark:text-slate-300">
          Revisió del repartiment abans de donar-lo per tancat.
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-sm">
        <span
          class="rounded-full px-3 py-1.5 font-semibold"
          :class="isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'"
        >
          {{ isConnected ? 'Dades en directe' : 'Desconnectat' }}
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          Actualitzat: {{ lastUpdate }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-xl border p-4 shadow-sm"
        :class="card.class"
      >
        <p class="text-sm font-semibold">{{ card.label }}</p>
        <p class="mt-2 text-3xl font-bold">{{ card.value }}</p>
        <p class="mt-1 text-sm opacity-80">{{ card.detail }}</p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">
            Estat general
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ resumEstat }}
          </p>
        </div>
        <div
          class="rounded-full px-4 py-2 text-sm font-bold"
          :class="estatFinal.class"
        >
          {{ estatFinal.text }}
        </div>
      </div>
    </div>

    <section
      v-for="bloc in blocsVisibles"
      :key="bloc.id"
      class="overflow-hidden rounded-xl border bg-white shadow-lg dark:bg-gray-800"
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
          <span class="rounded-full bg-white/70 px-3 py-1 text-sm font-bold dark:bg-gray-900/60">
            {{ bloc.items.length }}
          </span>
          <span class="text-lg">{{ blocsOberts[bloc.id] ? '−' : '+' }}</span>
        </div>
      </button>

      <div v-if="blocsOberts[bloc.id]" class="divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="item in bloc.items"
          :key="item.key"
          class="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]"
        >
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">
              {{ item.title }}
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ item.detail }}
            </p>
          </div>
          <div class="text-sm font-medium text-slate-500 dark:text-slate-400 lg:text-right">
            {{ item.context }}
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="senseIncidencies"
      class="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-900 shadow-lg dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
    >
      <p class="text-xl font-bold">Tot sembla a punt</p>
      <p class="mt-2 text-sm">
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
    description: "S'haurien de resoldre abans de tancar el repartiment.",
    items: [...critiques.value, ...critiquesProfessorat.value],
    borderClass: 'border-red-200 dark:border-red-800',
    headerClass: 'bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200',
  },
  {
    id: 'professorat',
    title: 'Avisos de professorat',
    description: 'Professors per sota de les hores recomanades.',
    items: avisosProfessorat.value,
    borderClass: 'border-amber-200 dark:border-amber-800',
    headerClass: 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  },
  {
    id: 'organitzacio',
    title: "Avisos d'organització",
    description: 'Tutories emparellades, tancaments i coherència del repartiment.',
    items: avisosOrganitzacio.value,
    borderClass: 'border-blue-200 dark:border-blue-800',
    headerClass: 'bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
  },
  {
    id: 'dades',
    title: 'Dades a revisar',
    description: 'Files amb camps buits o tipus no classificats.',
    items: dadesProblematiques.value,
    borderClass: 'border-slate-200 dark:border-slate-700',
    headerClass: 'bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
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
    class: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200',
  },
  {
    label: 'Avisos',
    value: avisosProfessorat.value.length + avisosOrganitzacio.value.length,
    detail: 'convé revisar',
    class: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  },
  {
    label: 'Classes',
    value: classes.value.length,
    detail: `${classesSenseAssignar.value.length} sense assignar`,
    class: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-white',
  },
  {
    label: 'Professors',
    value: professors.value.length,
    detail: `${incidenciesProfessorat.value.length} fora de rang`,
    class: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-white',
  },
]);

const estatFinal = computed(() => {
  if (critiques.value.length + critiquesProfessorat.value.length > 0) {
    return {
      text: 'No tancar encara',
      class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }
  if (avisosProfessorat.value.length || avisosOrganitzacio.value.length || dadesProblematiques.value.length) {
    return {
      text: 'Revisable',
      class: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    };
  }
  return {
    text: 'A punt per tancar',
    class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
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
