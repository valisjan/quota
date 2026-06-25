<template>
  <div class="sections space-y-4">
    <!-- Capçalera -->
    <div class="card">
      <div class="border-b border-slate-300 bg-slate-200 px-5 py-4">
        <h3 class="text-xl font-bold text-slate-950">
          Sincronització amb Google Sheets
        </h3>
        <p class="mt-1 text-base text-slate-700">
          Llegeix les pestanyes <strong>Classes</strong> i <strong>Professorat</strong>.
        </p>
        <p class="mt-2 text-sm font-medium text-slate-600">
          L'administració comprova Google Sheets en segon pla i sincronitza automàticament quan detecta canvis al full configurat.
        </p>
      </div>

      <div class="space-y-3 p-5">
        <!-- Botones principals -->
        <div class="flex gap-3">
          <button
            @click="comprovar"
            :disabled="estatComprova === 'comprovant'"
            class="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <span v-if="estatComprova === 'comprovant'" class="animate-spin">&#9203;</span>
            {{ estatComprova === 'comprovant' ? 'Comprovant...' : 'Comprova canvis' }}
          </button>
          <button
            @click="ferSync"
            :disabled="estatSync === 'sincronitzant' || settings.tancamentAdmin || cursStore.esBloqueig"
            class="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            <span v-if="estatSync === 'sincronitzant'" class="animate-spin">&#9203;</span>
            {{ estatSync === 'sincronitzant' ? 'Sincronitzant...' : 'Sincronitza' }}
          </button>
        </div>

        <div
          v-if="cursStore.esBloqueig"
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          El curs <strong>{{ cursStore.cursActiu?.nom }}</strong> està bloquejat. Desbloqueja'l a Curs acadèmic per poder sincronitzar.
        </div>

        <div
          v-else-if="settings.tancamentAdmin"
          class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
        >
          Administració bloquejada en mode tancament. Desbloqueja-la a la pestanya Tancament per sincronitzar.
        </div>

        <!-- Resultat comprovació -->
        <div
          v-if="estatComprova === 'ok' || estatComprova === 'error'"
          class="rounded-lg border px-4 py-3 text-base"
          :class="
            estatComprova === 'error'
              ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
              : resultComprova.alDia
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
              : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
          "
        >
          <div v-if="estatComprova === 'error'" class="font-medium text-orange-800 dark:text-orange-300">
            &#10060; Error en llegir Sheets: {{ errorComprovaMsg }}
          </div>
          <template v-else>
            <div class="flex items-center justify-between">
              <span
                class="font-semibold"
                :class="resultComprova.alDia ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'"
              >
                {{ resultComprova.alDia ? 'L\'app està al dia' : `Atenció: ${totalDiscrepancies} discrepàncies` }}
              </span>
              <span class="text-sm text-slate-600 dark:text-gray-400">
                Sheets: {{ resultComprova.totalSheets }} · App: {{ resultComprova.totalApp }}
              </span>
            </div>
            <div v-if="!resultComprova.alDia" class="mt-2 space-y-1 text-sm">
              <div v-if="resultComprova.noves > 0" class="text-green-700 dark:text-green-400">
                + {{ resultComprova.noves }} classes noves al full (s'afegiran)
              </div>
              <div v-if="resultComprova.eliminades > 0" class="text-orange-700 dark:text-orange-400">
                - {{ resultComprova.eliminades }} classes que ja no estan al full (s'eliminaran)
              </div>
              <div v-if="resultComprova.modificades > 0" class="text-blue-700 dark:text-blue-200">
                != {{ resultComprova.modificades }} classes amb hores o tipus diferent (s'actualitzaran)
              </div>
            </div>

            <div v-if="riscosComprova.length" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-rose-900">Revisa abans de sincronitzar</p>
                  <p class="mt-0.5 text-sm text-rose-800">
                    Hi ha canvis que afecten classes amb assignació existent.
                  </p>
                </div>
                <span class="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-rose-700">
                  {{ riscosComprova.length }}
                </span>
              </div>
              <div class="mt-3 space-y-2">
                <div
                  v-for="(risc, index) in riscosComprovaLimitats"
                  :key="`${risc.tipus}-${index}-${risc.resum}`"
                  class="rounded-md border border-rose-100 bg-white/80 px-3 py-2 text-sm"
                >
                  <div class="font-semibold text-rose-950">{{ risc.resum }}</div>
                  <div class="mt-0.5 text-xs text-rose-800">{{ risc.detall }}</div>
                </div>
              </div>
            </div>

            <div v-if="!resultComprova.alDia" class="mt-4 space-y-4">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  v-for="item in resumPreviewComprova"
                  :key="item.label"
                  class="rounded-lg border px-3 py-2 shadow-sm"
                  :class="item.cardClass"
                >
                  <div class="text-2xl font-bold leading-none" :class="item.valueClass">{{ item.valor }}</div>
                  <div class="mt-1 text-xs font-semibold uppercase tracking-wide" :class="item.labelClass">
                    {{ item.label }}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <section
                  v-for="seccio in llistesCanvisComprova"
                  :key="seccio.titol"
                  class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="font-semibold text-slate-950">{{ seccio.titol }}</h4>
                    <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="seccio.badgeClass">
                      {{ seccio.total }}
                    </span>
                  </div>
                  <div v-if="seccio.items.length" class="mt-3 space-y-2">
                    <div
                      v-for="(canvi, index) in seccio.items"
                      :key="`${seccio.titol}-${index}-${canvi.resum}`"
                      class="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <span class="font-semibold text-slate-900">{{ canvi.resum }}</span>
                        <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" :class="classeCanviComprova(canvi.tipus)">
                          {{ etiquetaCanviComprova(canvi.tipus) }}
                        </span>
                      </div>
                      <div v-if="canvi.detall" class="mt-1 text-xs text-slate-600">{{ canvi.detall }}</div>
                      <div v-if="canvi.assignacio" class="mt-1 text-xs font-medium text-rose-700">
                        {{ canvi.assignacio }}
                      </div>
                    </div>
                    <p v-if="seccio.restants > 0" class="text-xs font-medium text-slate-500">
                      + {{ seccio.restants }} canvis més
                    </p>
                  </div>
                  <p v-else class="mt-3 text-sm text-slate-500">{{ seccio.buit }}</p>
                </section>
              </div>

              <div v-if="comparadorAgrupatComprova.length" class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <section
                  v-for="seccio in comparadorAgrupatComprova"
                  :key="seccio.titol"
                  class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900"
                >
                  <div class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <div>
                      <h4 class="font-semibold text-slate-950 dark:text-white">{{ seccio.titol }}</h4>
                      <p class="text-xs text-slate-600 dark:text-slate-400">{{ seccio.subtitol }}</p>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {{ seccio.total }}
                    </span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-gray-800 dark:text-slate-400">
                        <tr>
                          <th class="px-4 py-2">{{ seccio.columna }}</th>
                          <th class="px-2 py-2 text-center">+</th>
                          <th class="px-2 py-2 text-center">=</th>
                          <th class="px-2 py-2 text-center">-</th>
                          <th class="px-4 py-2 text-right">Hores</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr v-for="fila in seccio.items" :key="`${seccio.titol}-${fila.nom}`">
                          <td class="px-4 py-2 font-semibold text-slate-900 dark:text-white">{{ fila.nom }}</td>
                          <td class="px-2 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300">{{ fila.noves }}</td>
                          <td class="px-2 py-2 text-center font-bold text-sky-700 dark:text-sky-300">{{ fila.modificades }}</td>
                          <td class="px-2 py-2 text-center font-bold text-amber-700 dark:text-amber-300">{{ fila.eliminades }}</td>
                          <td class="px-4 py-2 text-right font-mono font-bold" :class="classeDeltaHores(fila.deltaHores)">
                            {{ formatDeltaHores(fila.deltaHores) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-if="seccio.restants > 0" class="border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    + {{ seccio.restants }} files més
                  </p>
                </section>
              </div>
            </div>
            <div class="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Comprovat: {{ formatDataHora(resultComprova.timestamp) }}
            </div>
          </template>
        </div>

        <!-- Resultat sincronització -->
        <div
          v-if="estatSync === 'ok' || estatSync === 'error'"
          class="rounded-lg border px-4 py-3 text-base"
          :class="
            estatSync === 'error'
              ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
              : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
          "
        >
          <div v-if="estatSync === 'error'" class="font-medium text-orange-800 dark:text-orange-300">
            &#10060; Error de sincronització: {{ errorSyncMsg }}
          </div>
          <template v-else>
            <div class="font-semibold text-green-800 dark:text-green-300">Sincronització completada</div>
            <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div
                v-for="item in resumCanvisSync"
                :key="item.label"
                class="rounded-md border border-white/70 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/30"
              >
                <div class="text-lg font-semibold" :class="item.color">{{ item.valor }}</div>
                <div class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ item.label }}</div>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-gray-400">
              <span>{{ statsSync.total }} classes totals</span>
              <span v-if="statsSync.assignacionsConservades">{{ statsSync.assignacionsConservades }} assignacions conservades</span>
            </div>
            <div class="mt-1 text-sm text-slate-600 dark:text-gray-400">
              {{ statsSync.totalProfs }} professors · {{ statsSync.totalDeps }} departaments ·
              Sincronitzat: {{ formatDataHora(ultimaSync) }}
            </div>
            <div
              v-if="statsSync.historialGuardat === false"
              class="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            >
              La sincronització s'ha completat, però no s'ha pogut guardar l'historial: {{ statsSync.errorHistorial }}
            </div>
            <div
              v-if="statsSync.estatFontGuardat === false"
              class="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            >
              La sincronització s'ha completat, però no s'ha pogut guardar l'estat de Google Sheets: {{ statsSync.errorEstatFont }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <section class="card">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        @click="historialObert = !historialObert"
      >
        <div>
          <h3 class="text-lg font-semibold text-slate-950">
            Historial de sincronitzacions
          </h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {{ historial.length === 100 ? '100+ registres' : historial.length + ' registres' }} de sincronització.
          </p>
        </div>
        <span class="rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700">
          {{ historialObert ? 'Amaga' : 'Mostra' }}
        </span>
      </button>
      <div v-if="historialObert && historial.length === 0" class="border-t border-slate-100 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
        {{ errorHistorialMsg || 'Encara no hi ha sincronitzacions registrades.' }}
      </div>
      <div v-else-if="historialObert" class="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
        <div
          v-for="item in historial"
          :key="item.id"
          class="px-5 py-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-bold text-slate-950 dark:text-white">
                {{ formatDataHora(item.createdAt || item.timestamp) }}
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ item.actor || 'admin' }} · {{ item.total }} classes · {{ item.totalProfs }} professors · {{ item.totalDeps }} dep.
              </p>
            </div>
            <div class="flex flex-col gap-1.5">
              <!-- Classes -->
              <div class="flex flex-wrap gap-1.5 text-xs font-semibold">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Classes</span>
                <span class="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900 dark:text-green-100">+{{ item.afegides || 0 }}</span>
                <span class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900 dark:text-blue-100">~{{ item.actualitzades || 0 }}</span>
                <span class="rounded bg-orange-100 px-1.5 py-0.5 text-orange-800 dark:bg-orange-900 dark:text-orange-100">-{{ item.eliminades || 0 }}</span>
                <span v-if="item.assignacionsConservades" class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {{ item.assignacionsConservades }} conservades
                </span>
              </div>
              <!-- Professors -->
              <div
                v-if="(item.profsAfegits || 0) + (item.profsMigrats || 0) + (item.profsEliminats || 0) > 0"
                class="flex flex-wrap gap-1.5 text-xs font-semibold"
              >
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Professors</span>
                <span v-if="item.profsAfegits" class="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900 dark:text-green-100">+{{ item.profsAfegits }}</span>
                <span v-if="item.profsMigrats" class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900 dark:text-blue-100">~{{ item.profsMigrats }} migrats</span>
                <span v-if="item.profsEliminats" class="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800 dark:bg-rose-900 dark:text-rose-100">-{{ item.profsEliminats }}</span>
              </div>
              <!-- Departaments -->
              <div
                v-if="(item.depsAfegits || 0) + (item.depsEliminats || 0) > 0"
                class="flex flex-wrap gap-1.5 text-xs font-semibold"
              >
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Dep.</span>
                <span v-if="item.depsAfegits" class="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900 dark:text-green-100">+{{ item.depsAfegits }}</span>
                <span v-if="item.depsEliminats" class="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800 dark:bg-rose-900 dark:text-rose-100">-{{ item.depsEliminats }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { query, orderBy, limit } from 'firebase/firestore';
import { sincronitzar, comprovarDiscrepancies } from '../services/sincronitzacio.js';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';
import { E2E_AUTH_BYPASS } from '../services/e2e';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';

defineProps({
  embedded: { type: Boolean, default: false },
});

const authStore = useAuthStore();
const cursStore = useCursStore();
const toast = useToastStore();
const estatComprova = ref('idle');
const estatSync = ref('idle');
const resultComprova = ref(null);
const errorComprovaMsg = ref('');
const errorSyncMsg = ref('');
const ultimaSync = ref(null);
const statsSync = ref({
  total: 0, afegides: 0, actualitzades: 0, eliminades: 0,
  assignacionsConservades: 0, totalProfs: 0, totalDeps: 0,
});
const historialObert = ref(false);
const settings = ref({ ...DEFAULT_APP_SETTINGS });
let settingsUnsubscribe = null;

const { items: historialRaw, error: historialError } = useCursCollectionSnapshot({
  colName: 'sync_history',
  queryFactory: (col) => query(col, orderBy('createdAt', 'desc'), limit(100)),
});
const historial = computed(() => historialRaw.value);
const errorHistorialMsg = computed(() =>
  historialError.value ? `No es pot carregar l'historial: ${historialError.value.message}` : ''
);

const totalDiscrepancies = computed(() =>
  resultComprova.value
    ? resultComprova.value.totalCanvis
      ?? resultComprova.value.noves + resultComprova.value.eliminades + resultComprova.value.modificades
    : 0
);

const resumCanvisSync = computed(() => [
  { label: 'Afegides', valor: statsSync.value.afegides || 0, color: 'text-green-700 dark:text-green-300' },
  { label: 'Actualitzades', valor: statsSync.value.actualitzades || 0, color: 'text-blue-700 dark:text-blue-300' },
  { label: 'Eliminades', valor: statsSync.value.eliminades || 0, color: 'text-orange-700 dark:text-orange-300' },
]);

const riscosComprova = computed(() => resultComprova.value?.riscos || []);
const riscosComprovaLimitats = computed(() => riscosComprova.value.slice(0, 6));

const resumPreviewComprova = computed(() => {
  const classes = resultComprova.value?.classes || {};
  const professors = resultComprova.value?.professors || {};
  const departaments = resultComprova.value?.departaments || {};

  return [
    {
      label: 'Classes noves',
      valor: classes.noves || 0,
      cardClass: 'border-emerald-200 bg-emerald-50',
      valueClass: 'text-emerald-700',
      labelClass: 'text-emerald-800',
    },
    {
      label: 'Classes actualitzades',
      valor: classes.modificades || 0,
      cardClass: 'border-sky-200 bg-sky-50',
      valueClass: 'text-sky-700',
      labelClass: 'text-sky-800',
    },
    {
      label: 'Classes eliminades',
      valor: classes.eliminades || 0,
      cardClass: 'border-amber-200 bg-amber-50',
      valueClass: 'text-amber-700',
      labelClass: 'text-amber-800',
    },
    {
      label: 'Professorat i deps.',
      valor: (professors.totalCanvis || 0) + (departaments.totalCanvis || 0),
      cardClass: 'border-violet-200 bg-violet-50',
      valueClass: 'text-violet-700',
      labelClass: 'text-violet-800',
    },
  ];
});

function limitarCanvis(items = [], limit = 6) {
  return {
    items: items.slice(0, limit),
    restants: Math.max(0, items.length - limit),
  };
}

const llistesCanvisComprova = computed(() => {
  const classes = resultComprova.value?.classes?.preview || {};
  const professors = resultComprova.value?.professors?.preview || {};
  const departaments = resultComprova.value?.departaments?.preview || {};

  const classesItems = [
    ...(classes.eliminades || []),
    ...(classes.modificades || []),
    ...(classes.noves || []),
  ];
  const professorItems = [
    ...(professors.migracions || []),
    ...(professors.modificades || []),
    ...(professors.noves || []),
    ...(professors.conservatsForaFull || []),
  ];
  const departamentItems = [
    ...(departaments.eliminats || []),
    ...(departaments.afegits || []),
  ];
  const classesLimit = limitarCanvis(classesItems);
  const professorLimit = limitarCanvis(professorItems);
  const departamentLimit = limitarCanvis(departamentItems);

  return [
    {
      titol: 'Classes',
      total: classesItems.length,
      ...classesLimit,
      badgeClass: 'bg-sky-100 text-sky-800',
      buit: 'Sense canvis de classes.',
    },
    {
      titol: 'Professorat',
      total: professorItems.length,
      ...professorLimit,
      badgeClass: 'bg-violet-100 text-violet-800',
      buit: 'Sense canvis de professorat.',
    },
    {
      titol: 'Departaments',
      total: departamentItems.length,
      ...departamentLimit,
      badgeClass: 'bg-emerald-100 text-emerald-800',
      buit: 'Sense canvis de departaments.',
    },
  ];
});

function limitarResumAgrupat(items = [], limit = 8) {
  return {
    items: items.slice(0, limit),
    restants: Math.max(0, items.length - limit),
    total: items.length,
  };
}

const comparadorAgrupatComprova = computed(() => {
  const classes = resultComprova.value?.classes || {};
  const perDepartament = limitarResumAgrupat(classes.resumPerDepartament || []);
  const perMateria = limitarResumAgrupat(classes.resumPerMateria || []);

  return [
    {
      titol: 'Canvis per departament',
      subtitol: 'Impacte de Classes agrupat pel departament del full.',
      columna: 'Departament',
      ...perDepartament,
    },
    {
      titol: 'Canvis per matèria',
      subtitol: 'Matèries amb més moviment abans de sincronitzar.',
      columna: 'Matèria',
      ...perMateria,
    },
  ].filter((seccio) => seccio.total > 0);
});

function formatDataHora(ts) {
  if (!ts) return '?';
  return new Date(ts).toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function etiquetaCanviComprova(tipus) {
  const etiquetes = {
    nova: 'Nova',
    modificada: 'Modificada',
    eliminada: 'Eliminada',
    nou: 'Nou',
    modificat: 'Actualitzat',
    migracio: 'Migració',
    conservat: 'Conservat',
    eliminat: 'Eliminat',
  };
  return etiquetes[tipus] || 'Canvi';
}

function classeCanviComprova(tipus) {
  if (tipus === 'nova' || tipus === 'nou') return 'bg-emerald-100 text-emerald-800';
  if (tipus === 'eliminada' || tipus === 'eliminat') return 'bg-amber-100 text-amber-800';
  if (tipus === 'migracio') return 'bg-violet-100 text-violet-800';
  if (tipus === 'conservat') return 'bg-slate-200 text-slate-700';
  return 'bg-sky-100 text-sky-800';
}

function formatHores(valor) {
  const numero = Number(valor) || 0;
  return Number.isInteger(numero) ? `${numero}h` : `${numero.toFixed(2)}h`;
}

function formatDeltaHores(valor) {
  const numero = Number(valor) || 0;
  if (numero === 0) return '0h';
  return `${numero > 0 ? '+' : ''}${formatHores(numero)}`;
}

function classeDeltaHores(valor) {
  const numero = Number(valor) || 0;
  if (numero > 0) return 'text-emerald-700 dark:text-emerald-300';
  if (numero < 0) return 'text-amber-700 dark:text-amber-300';
  return 'text-slate-600 dark:text-slate-300';
}

async function comprovar() {
  if (estatComprova.value === 'comprovant') return;
  estatComprova.value = 'comprovant';
  try {
    resultComprova.value = await comprovarDiscrepancies(cursStore.cursActiuId, { sheetsId: settings.value.sheetsId });
    estatComprova.value = 'ok';
  } catch (e) {
    errorComprovaMsg.value = e.message;
    estatComprova.value = 'error';
  }
}

async function ferSync() {
  if (estatSync.value === 'sincronitzant' || settings.value.tancamentAdmin || cursStore.esBloqueig) return;
  estatSync.value = 'sincronitzant';
  try {
    const result = await sincronitzar(cursStore.cursActiuId, { actor: authStore.usuari || authStore.rol || 'admin', sheetsId: settings.value.sheetsId });
    statsSync.value = result;
    ultimaSync.value = result.timestamp;
    estatSync.value = 'ok';
    toast.ok(
      `Sincronització completada: ${result.afegides || 0} afegides, `
      + `${result.actualitzades || 0} actualitzades, ${result.eliminades || 0} eliminades.`
    );
    // Actualitzar la comprovació automàticament després del sync
    resultComprova.value = {
      totalSheets: result.total,
      totalApp: result.total,
      noves: 0, eliminades: 0, modificades: 0, totalCanvis: 0,
      detalls: [],
      classes: {
        totalSheets: result.total,
        totalApp: result.total,
        noves: 0,
        eliminades: 0,
        modificades: 0,
        totalCanvis: 0,
        detalls: [],
        preview: { noves: [], modificades: [], eliminades: [] },
        resumPerDepartament: [],
        resumPerMateria: [],
        riscos: [],
      },
      professors: {
        totalSheets: result.totalProfs,
        totalApp: result.totalProfs,
        noves: 0,
        modificades: 0,
        eliminades: 0,
        migracions: 0,
        totalCanvis: 0,
        preview: { noves: [], modificades: [], migracions: [], conservatsForaFull: [] },
      },
      departaments: {
        totalSheets: result.totalDeps,
        totalApp: result.totalDeps,
        afegits: 0,
        eliminats: 0,
        modificades: 0,
        totalCanvis: 0,
        preview: { afegits: [], eliminats: [] },
      },
      riscos: [],
      alDia: true,
      timestamp: result.timestamp,
    };
    estatComprova.value = 'ok';
  } catch (e) {
    errorSyncMsg.value = e.message;
    estatSync.value = 'error';
    toast.error('Error de sincronització: ' + e.message);
  }
}

function setupCursSubscriptions(cursId) {
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
  if (E2E_AUTH_BYPASS || !cursId) {
    settings.value = { ...DEFAULT_APP_SETTINGS };
    return;
  }
  settingsUnsubscribe = subscribeAppSettings(cursId, (value) => {
    settings.value = value;
  });
}

watch(() => cursStore.cursActiuId, setupCursSubscriptions, { immediate: true });

onUnmounted(() => {
  settingsUnsubscribe?.();
});
</script>
