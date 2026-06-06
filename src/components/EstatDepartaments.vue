<template>
  <div class="space-y-5">
    <section class="card p-5">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-slate-600">Visió global</p>
          <h2 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {{ titularEstat }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-700">
            {{ stats.classesAssignades }} de {{ stats.classesTotal }} classes tenen assignació completa.
            {{ stats.senseAssignar }} classes queden pendents de revisar.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <router-link to="/admin/dades" class="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark">
            Revisar pendents
          </router-link>
          <router-link to="/admin/dades" class="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Sincronitzar
          </router-link>
          <router-link to="/admin/untis" class="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Preparar Untis
          </router-link>
        </div>
      </div>

      <div class="mt-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-slate-600">Progrés del repartiment</p>
            <p class="mt-1 text-4xl font-semibold text-slate-950">{{ pctGlobal }}%</p>
          </div>
          <p class="text-right text-sm text-slate-600">
            {{ stats.horesAssignades }}h / {{ stats.horesTotals }}h assignades
          </p>
        </div>
        <div class="mt-3 h-3 overflow-hidden rounded bg-slate-100">
          <div class="h-full rounded-sm bg-success" :style="{ width: `${pctGlobal}%` }" />
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="metric-card border-t-primary text-slate-900"
        :class="card.class"
      >
        <p class="metric-label">{{ card.label }}</p>
        <p class="metric-value">{{ card.value }}</p>
        <p class="metric-detail">{{ card.detail }}</p>
      </div>
    </section>

    <section class="card p-4">
      <div class="grid gap-3 md:grid-cols-3">
        <div
          v-for="pas in passos"
          :key="pas.titol"
          class="border-l-4 bg-slate-50 p-4"
          :class="pas.actiu ? 'border-l-primary' : 'border-l-slate-200'"
        >
          <div class="flex items-start gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-sm font-medium text-slate-700">
              {{ pas.num }}
            </span>
            <div>
              <h3 class="text-sm font-semibold text-slate-950">{{ pas.titol }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ pas.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="overflow-hidden card">
      <div class="border-b border-slate-300 bg-slate-200 px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 class="text-xl font-bold text-slate-950">Departaments</h3>
            <p class="mt-1 text-sm text-slate-600">
              Ordenat per classes sense assignar. Clica un departament per veure el detall.
            </p>
          </div>
          <div class="flex gap-1 border border-slate-200 bg-white p-1">
            <button
              v-for="o in ordres"
              :key="o.valor"
              @click="ordre = o.valor"
              class="rounded-sm px-3 py-2 text-sm font-medium transition"
              :class="ordre === o.valor
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'"
            >
              {{ o.etiqueta }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="carregant" class="p-10 text-center text-sm text-slate-600">
        Carregant estat dels departaments...
      </div>

      <div v-else-if="!departamentsOrdenats.length" class="p-10 text-center">
        <p class="font-semibold text-slate-950">No hi ha departaments configurats.</p>
        <p class="mt-1 text-sm text-slate-600">Sincronitza amb Google Sheets per crear-los.</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <article
          v-for="dept in departamentsOrdenats"
          :key="dept.nom"
          class="p-4 transition hover:bg-slate-50 sm:p-5"
        >
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem_7rem] xl:items-center">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="h-3 w-3 rounded-sm" :class="puntClass(dept)"></span>
                <h4 class="truncate text-base font-semibold text-slate-950">{{ dept.nom }}</h4>
                <span class="rounded-sm px-2 py-0.5 text-xs font-medium" :class="estatBadgeClass(dept)">
                  {{ estatEtiqueta(dept) }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600">
                {{ dept.professors }} professors · {{ dept.assignades }} / {{ dept.total }} classes · {{ dept.horesAssignades }}h / {{ dept.horesTotals }}h
              </p>
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>{{ dept.pct }}%</span>
                <span v-if="dept.senseProfessor">{{ dept.senseProfessor }} pendents</span>
              </div>
              <div class="h-2 overflow-hidden rounded bg-slate-100">
                <div class="h-full rounded-sm" :class="barraClass(dept)" :style="{ width: `${dept.pct}%` }" />
              </div>
            </div>

            <button
              v-if="dept.classesSenseProfessor.length"
              @click="expandit = expandit === dept.nom ? null : dept.nom"
              class="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {{ expandit === dept.nom ? 'Amaga' : 'Detall' }}
            </button>
            <span v-else class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700">
              Complet
            </span>
          </div>

          <div
            v-if="dept.classesSenseProfessor.length && expandit === dept.nom"
            class="mt-4 border border-danger/30 bg-danger/5 p-4"
          >
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="(c, i) in dept.classesSenseProfessor"
                :key="i"
                class="border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <p class="font-semibold text-slate-950">{{ c.curs }} {{ c.grup }}</p>
                <p class="mt-0.5 text-slate-700">{{ c.materia }} · {{ c.hores }}h</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { classeCompletamentAssignada } from '../utils/assignacions';
import { exclosaDelRepartiment } from '../utils/tipus';
import { classePertanyDepartament } from '../utils/departaments';

const cursStore = useCursStore();

const classes = ref([]);
const professors = ref([]);
const departaments = ref([]);
const carregant = ref(true);
const ordre = ref('pct');
const expandit = ref(null);

const ordres = [
  { valor: 'pct', etiqueta: 'Pendents' },
  { valor: 'nom', etiqueta: 'A-Z' },
];

let unsubs = [];

function setupListeners() {
  unsubs.forEach((u) => u());
  unsubs = [];
  unsubs.push(
    onSnapshot(cursStore.col('classes'), (snap) => {
      classes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      carregant.value = false;
    }),
    onSnapshot(cursStore.col('professors'), (snap) => {
      professors.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }),
    onSnapshot(cursStore.col('departaments'), (snap) => {
      departaments.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    })
  );
}

watch(() => cursStore.cursActiuId, setupListeners, { immediate: true });

onUnmounted(() => unsubs.forEach((u) => u()));

function classesDelDept(nomDept) {
  return classes.value.filter(
    (c) =>
      Number(c.hores) > 0 &&
      classePertanyDepartament(c, nomDept) &&
      !exclosaDelRepartiment(c.tipus)
  );
}

const perDepartament = computed(() => {
  return departaments.value.map((dept) => {
    const totes = classesDelDept(dept.nom);
    const assignades = totes.filter(classeCompletamentAssignada);
    const senseProfessor = totes.filter((c) => !classeCompletamentAssignada(c));
    const horesTotals = totes.reduce((s, c) => s + Number(c.hores || 0), 0);
    const horesAssignades = assignades.reduce((s, c) => s + Number(c.hores || 0), 0);
    const profsDelDept = professors.value.filter((p) => p.departament === dept.nom);
    const pct = totes.length ? Math.round((assignades.length / totes.length) * 100) : 100;

    return {
      nom: dept.nom,
      total: totes.length,
      assignades: assignades.length,
      senseProfessor: senseProfessor.length,
      classesSenseProfessor: senseProfessor.slice(0, 24),
      horesTotals,
      horesAssignades,
      professors: profsDelDept.length,
      pct,
    };
  });
});

const departamentsOrdenats = computed(() => {
  const llista = [...perDepartament.value];
  if (ordre.value === 'nom') return llista.sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
  return llista.sort((a, b) => a.pct - b.pct || a.nom.localeCompare(b.nom, 'ca'));
});

const stats = computed(() => {
  const tots = perDepartament.value;
  return {
    total: tots.length,
    complets: tots.filter((d) => d.pct === 100 && d.total > 0).length,
    enProgres: tots.filter((d) => d.pct > 0 && d.pct < 100).length,
    pendents: tots.filter((d) => d.pct === 0 && d.total > 0).length,
    senseAssignar: tots.reduce((s, d) => s + d.senseProfessor, 0),
    classesTotal: tots.reduce((s, d) => s + d.total, 0),
    classesAssignades: tots.reduce((s, d) => s + d.assignades, 0),
    horesTotals: tots.reduce((s, d) => s + d.horesTotals, 0),
    horesAssignades: tots.reduce((s, d) => s + d.horesAssignades, 0),
  };
});

const pctGlobal = computed(() => {
  const { classesTotal, classesAssignades } = stats.value;
  return classesTotal ? Math.round((classesAssignades / classesTotal) * 100) : 0;
});

const titularEstat = computed(() => {
  if (!stats.value.classesTotal) return 'Encara no hi ha quota importada.';
  if (stats.value.senseAssignar === 0) return 'Totes les classes estan assignades.';
  if (pctGlobal.value >= 75) return 'Queda poca feina per fer.';
  if (pctGlobal.value >= 35) return 'El repartiment va avançant.';
  return 'Moltes classes encara sense assignar.';
});

const cards = computed(() => [
  {
    label: 'Departaments',
    detail: 'amb quota',
    value: stats.value.total,
    class: 'border-t-slate-300',
  },
  {
    label: 'Completats',
    detail: 'sense pendents',
    value: stats.value.complets,
    class: 'border-t-success',
  },
  {
    label: 'En progrés',
    detail: 'assignació parcial',
    value: stats.value.enProgres,
    class: 'border-t-amber-400',
  },
  {
    label: 'Pendents',
    detail: 'classes sense assignació',
    value: stats.value.senseAssignar,
    class: 'border-t-danger',
  },
]);

const passos = computed(() => [
  {
    num: '1',
    titol: 'Sincronitzar',
    text: stats.value.classesTotal ? 'Dades carregades' : 'Importa Google Sheets',
    actiu: !stats.value.classesTotal,
  },
  {
    num: '2',
    titol: 'Repartir',
    text: stats.value.senseAssignar ? `${stats.value.senseAssignar} pendents` : 'Repartiment complet',
    actiu: Boolean(stats.value.classesTotal && stats.value.senseAssignar),
  },
  {
    num: '3',
    titol: 'Exportar',
    text: 'Prepara Untis',
    actiu: Boolean(stats.value.classesTotal && !stats.value.senseAssignar),
  },
]);

function estatBadgeClass(dept) {
  if (dept.total === 0) return 'bg-slate-100 text-slate-600';
  if (dept.pct === 100) return 'bg-success/20 text-slate-800';
  if (dept.pct === 0) return 'bg-danger/15 text-slate-800';
  return 'bg-amber-100 text-slate-800';
}

function estatEtiqueta(dept) {
  if (dept.total === 0) return 'Buit';
  if (dept.pct === 100) return 'Complet';
  if (dept.pct === 0) return 'Pendent';
  return 'En progrés';
}

function barraClass(dept) {
  if (dept.pct === 100) return 'bg-success';
  if (dept.pct >= 50) return 'bg-amber-400';
  return 'bg-danger';
}

function puntClass(dept) {
  if (dept.pct === 100) return 'bg-success';
  if (dept.pct === 0) return 'bg-danger';
  return 'bg-amber-400';
}
</script>
