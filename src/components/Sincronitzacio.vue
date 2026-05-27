<template>
  <div class="max-w-2xl space-y-4">
    <!-- Capçalera -->
    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 class="text-xl font-semibold text-slate-950">
          Sincronització amb Google Sheets
        </h3>
        <p class="mt-1 text-base text-slate-600">
          Pestanyes: <strong>Classes</strong> · <strong>Professorat</strong>
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
            <span v-if="estatComprova === 'comprovant'" class="animate-spin">⏳</span>
            <span v-else>🔍</span>
            Comprova
          </button>
          <button
            @click="ferSync"
            :disabled="estatSync === 'sincronitzant' || settings.tancamentAdmin || cursStore.esBloqueig"
            class="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0024B6] px-4 py-3 text-base font-medium text-white transition hover:bg-[#001A8A] disabled:opacity-50"
          >
            <span v-if="estatSync === 'sincronitzant'" class="animate-spin">⏳</span>
            <span v-else>🔄</span>
            Sincronitzar
          </button>
        </div>

        <div
          v-if="cursStore.esBloqueig"
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          El curs <strong>{{ cursStore.cursActiu?.nom }}</strong> està bloquejat. Desbloqueja'l a Gestió de cursos per poder sincronitzar.
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
            ❌ Error en llegir Sheets: {{ errorComprovaMsg }}
          </div>
          <template v-else>
            <div class="flex items-center justify-between">
              <span
                class="font-semibold"
                :class="resultComprova.alDia ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'"
              >
                {{ resultComprova.alDia ? '✅ L\'app és al dia' : `⚠️ ${totalDiscrepancies} discrepàncies` }}
              </span>
              <span class="text-sm text-slate-500 dark:text-gray-400">
                Sheets: {{ resultComprova.totalSheets }} · App: {{ resultComprova.totalApp }}
              </span>
            </div>
            <div v-if="!resultComprova.alDia" class="mt-2 space-y-1 text-sm">
              <div v-if="resultComprova.noves > 0" class="text-green-700 dark:text-green-400">
                ＋ {{ resultComprova.noves }} classes noves al full (s'afegiran)
              </div>
              <div v-if="resultComprova.eliminades > 0" class="text-orange-700 dark:text-orange-400">
                − {{ resultComprova.eliminades }} classes que ja no estan al full (s'eliminaran)
              </div>
              <div v-if="resultComprova.modificades > 0" class="text-blue-700 dark:text-blue-200">
                ≠ {{ resultComprova.modificades }} classes amb hores o tipus diferent (s'actualitzaran)
              </div>
            </div>
            <div class="mt-2 text-sm text-slate-500 dark:text-gray-400">
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
            ❌ Error de sincronització: {{ errorSyncMsg }}
          </div>
          <template v-else>
            <div class="font-semibold text-green-800 dark:text-green-300">✅ Sincronització completada</div>
            <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-gray-400">
              <span>{{ statsSync.total }} classes totals</span>
              <span v-if="statsSync.afegides">＋{{ statsSync.afegides }} afegides</span>
              <span v-if="statsSync.actualitzades">≠ {{ statsSync.actualitzades }} actualitzades</span>
              <span v-if="statsSync.eliminades">− {{ statsSync.eliminades }} eliminades</span>
              <span v-if="statsSync.assignacionsConservades">🔒 {{ statsSync.assignacionsConservades }} assignacions conservades</span>
            </div>
            <div class="mt-1 text-sm text-slate-500 dark:text-gray-400">
              {{ statsSync.totalProfs }} professors · {{ statsSync.totalDeps }} departaments ·
              Sincronitzat: {{ formatDataHora(ultimaSync) }}
            </div>
            <div
              v-if="statsSync.historialGuardat === false"
              class="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            >
              La sincronització s'ha completat, però no s'ha pogut guardar l'historial: {{ statsSync.errorHistorial }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-xl font-semibold text-slate-950">
          Historial de sincronitzacions
        </h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Últimes sincronitzacions guardades a Firestore.
        </p>
      </div>
      <div v-if="historial.length === 0" class="p-5 text-sm text-slate-500 dark:text-slate-400">
        {{ errorHistorialMsg || 'Encara no hi ha sincronitzacions registrades.' }}
      </div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="item in historial"
          :key="item.id"
          class="px-5 py-4"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">
                {{ formatDataHora(item.createdAt || item.timestamp) }}
              </p>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ item.actor || 'admin' }} · {{ item.total }} classes · {{ item.totalProfs }} professors · {{ item.totalDeps }} departaments
              </p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-semibold">
              <span class="rounded bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900 dark:text-green-100">+{{ item.afegides || 0 }}</span>
              <span class="rounded bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-900 dark:text-blue-100">={{ item.actualitzades || 0 }}</span>
              <span class="rounded bg-orange-100 px-2 py-1 text-orange-800 dark:bg-orange-900 dark:text-orange-100">-{{ item.eliminades || 0 }}</span>
              <span class="rounded bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                conservades {{ item.assignacionsConservades || 0 }}
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
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { sincronitzar, comprovarDiscrepancies } from '../services/sincronitzacio.js';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';

const authStore = useAuthStore();
const cursStore = useCursStore();
const toast = useToastStore();
const estatComprova = ref('idle');
const estatSync = ref('idle');
const resultComprova = ref(null);
const errorComprovaMsg = ref('');
const errorSyncMsg = ref('');
const errorHistorialMsg = ref('');
const ultimaSync = ref(null);
const statsSync = ref({
  total: 0, afegides: 0, actualitzades: 0, eliminades: 0,
  assignacionsConservades: 0, totalProfs: 0, totalDeps: 0,
});
const historial = ref([]);
const settings = ref({ ...DEFAULT_APP_SETTINGS });
let historialUnsubscribe = null;
let settingsUnsubscribe = null;

const totalDiscrepancies = computed(() =>
  resultComprova.value
    ? resultComprova.value.noves + resultComprova.value.eliminades + resultComprova.value.modificades
    : 0
);

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

async function comprovar() {
  if (estatComprova.value === 'comprovant') return;
  estatComprova.value = 'comprovant';
  try {
    resultComprova.value = await comprovarDiscrepancies(cursStore.cursActiuId);
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
    const result = await sincronitzar(cursStore.cursActiuId, { actor: authStore.usuari || authStore.rol || 'admin' });
    statsSync.value = result;
    ultimaSync.value = result.timestamp;
    estatSync.value = 'ok';
    toast.ok(`Sincronització completada: ${result.total} classes, ${result.totalProfs} professors.`);
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
  historialUnsubscribe?.();
  settingsUnsubscribe?.();
  historialUnsubscribe = null;
  settingsUnsubscribe = null;
  historial.value = [];
  if (!cursId) {
    settings.value = { ...DEFAULT_APP_SETTINGS };
    return;
  }
  historialUnsubscribe = onSnapshot(
    query(collection(db, 'cursos', cursId, 'sync_history')),
    (snapshot) => {
      errorHistorialMsg.value = '';
      historial.value = snapshot.docs
        .map((docu) => ({ id: docu.id, ...docu.data() }))
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        .slice(0, 10);
    },
    (err) => {
      console.error('Error carregant historial de sincronitzacions:', err);
      errorHistorialMsg.value = `No es pot carregar l'historial: ${err.message}`;
    }
  );
  settingsUnsubscribe = subscribeAppSettings(cursId, (value) => {
    settings.value = value;
  });
}

watch(() => cursStore.cursActiuId, setupCursSubscriptions, { immediate: true });

onUnmounted(() => {
  historialUnsubscribe?.();
  settingsUnsubscribe?.();
});
</script>
