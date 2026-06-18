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
            <div v-if="detallsComprova.length" class="mt-3 space-y-1 text-sm">
              <div
                v-for="(canvi, index) in detallsComprova"
                :key="`${canvi.tipus}-${index}-${canvi.resum}`"
                class="rounded-md border border-orange-200/80 bg-white/70 px-3 py-2 dark:border-orange-800 dark:bg-gray-900/40"
              >
                <span class="mr-2 font-bold" :class="classeCanviComprova(canvi.tipus)">
                  {{ etiquetaCanviComprova(canvi.tipus) }}
                </span>
                <span class="font-semibold text-slate-800 dark:text-slate-100">{{ canvi.resum }}</span>
                <span v-if="canvi.detall" class="mt-0.5 block text-xs text-slate-700 dark:text-slate-300">
                  {{ canvi.detall }}
                </span>
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
            {{ historial.length }} registres de sincronització.
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
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-bold text-slate-950 dark:text-white">
                {{ formatDataHora(item.createdAt || item.timestamp) }}
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ item.actor || 'admin' }} · {{ item.total }} classes · {{ item.totalProfs }} professors · {{ item.totalDeps }} departaments
              </p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-semibold">
              <span class="rounded bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900 dark:text-green-100">+{{ item.afegides || 0 }}</span>
              <span class="rounded bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-900 dark:text-blue-100">={{ item.actualitzades || 0 }}</span>
              <span class="rounded bg-orange-100 px-2 py-1 text-orange-800 dark:bg-orange-900 dark:text-orange-100">-{{ item.eliminades || 0 }}</span>
              <span class="rounded bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {{ item.assignacionsConservades || 0 }} conservades
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
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

const { items: historialRaw, error: historialError } = useCursCollectionSnapshot({ colName: 'sync_history' });
const historial = computed(() =>
  [...historialRaw.value]
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 10)
);
const errorHistorialMsg = computed(() =>
  historialError.value ? `No es pot carregar l'historial: ${historialError.value.message}` : ''
);

const totalDiscrepancies = computed(() =>
  resultComprova.value
    ? resultComprova.value.noves + resultComprova.value.eliminades + resultComprova.value.modificades
    : 0
);

const resumCanvisSync = computed(() => [
  { label: 'Afegides', valor: statsSync.value.afegides || 0, color: 'text-green-700 dark:text-green-300' },
  { label: 'Actualitzades', valor: statsSync.value.actualitzades || 0, color: 'text-blue-700 dark:text-blue-300' },
  { label: 'Eliminades', valor: statsSync.value.eliminades || 0, color: 'text-orange-700 dark:text-orange-300' },
]);

const detallsComprova = computed(() => {
  if (!resultComprova.value?.detalls?.length || resultComprova.value.totalCanvis >= 10) return [];
  return resultComprova.value.detalls;
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
  };
  return etiquetes[tipus] || 'Canvi';
}

function classeCanviComprova(tipus) {
  if (tipus === 'nova') return 'text-green-700 dark:text-green-300';
  if (tipus === 'eliminada') return 'text-orange-700 dark:text-orange-300';
  return 'text-blue-700 dark:text-blue-300';
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
      noves: 0, eliminades: 0, modificades: 0, alDia: true,
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
