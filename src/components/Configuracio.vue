<template>
  <div class="max-w-4xl space-y-6">
    <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-semibold text-slate-950">
          Guàrdies de pati
        </h3>
        <p class="mt-1 text-sm text-slate-500">
          Es reparteixen automàticament entre els departaments segons el nombre de professors. Educació Física, Agrària i Forneria no entren en el repartiment.
        </p>
      </div>

      <div class="grid gap-5 p-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <label class="block text-sm font-semibold text-slate-700">
          Total de guàrdies de pati
          <input
            v-model.number="formulari.totalGuardiesPati"
            type="number"
            min="0"
            step="1"
            class="form-input mt-2 w-full bg-white text-lg font-semibold"
          />
        </label>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-800">
              Repartiment previst
            </p>
            <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {{ totalPreviewAssignat }} / {{ totalGuardiesPatiFormulari }}
            </span>
          </div>

          <div v-if="quotesGuardies.length" class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="item in quotesGuardies"
              :key="item.departament"
              class="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
            >
              <span class="min-w-0 truncate font-medium text-slate-800">{{ item.departament }}</span>
              <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                {{ item.quota }}
              </span>
            </div>
          </div>
          <p v-else class="text-sm text-slate-500">
            No hi ha professorat computable per repartir guàrdies.
          </p>

          <div class="mt-4 flex justify-end">
            <button
              type="button"
              @click="guardarGuardies"
              :disabled="guardant"
              class="rounded-md bg-[#0024B6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#001A8A] disabled:opacity-50"
            >
              {{ guardant ? 'Guardant...' : 'Guardar guàrdies' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Secció: Full de càlcul -->
    <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-semibold text-slate-950">Full de càlcul (Google Sheets)</h3>
        <p class="mt-1 text-sm text-slate-500">
          ID del full des d'on s'importen les classes i el professorat. Ha de ser públic (visible per a tothom amb l'enllaç).
        </p>
      </div>

      <div class="space-y-5 p-5">

        <!-- ID actiu -->
        <div>
          <p class="text-sm font-semibold text-slate-700">ID actiu</p>
          <div class="mt-2 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700">
              {{ formulari.sheetsId || DEFAULT_SHEETS_ID }}
            </code>
            <a
              :href="`https://docs.google.com/spreadsheets/d/${formulari.sheetsId || DEFAULT_SHEETS_ID}`"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Obrir
            </a>
          </div>
        </div>

        <!-- ID anterior (backup) -->
        <div v-if="formulari.sheetsIdAnterior" class="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-medium text-amber-900">
            ID anterior guardat com a còpia de seguretat:
          </p>
          <code class="mt-1 block truncate font-mono text-sm text-amber-800">{{ formulari.sheetsIdAnterior }}</code>
          <button
            type="button"
            @click="tornarAnterior"
            :disabled="guardantSheets"
            class="mt-3 text-sm font-semibold text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
          >
            Tornar a l'ID anterior
          </button>
        </div>

        <!-- Canviar ID -->
        <div>
          <p class="text-sm font-semibold text-slate-700">Canviar ID</p>
          <p class="mt-0.5 text-xs text-slate-500">Enganxa l'ID o la URL completa del full.</p>
          <div class="mt-2 flex gap-2">
            <input
              v-model="nouSheetsIdRaw"
              type="text"
              placeholder="1uKYDn_... o https://docs.google.com/spreadsheets/d/..."
              class="form-input min-w-0 flex-1 font-mono text-sm"
              @keydown.enter="verificarSheets"
            />
            <button
              type="button"
              @click="verificarSheets"
              :disabled="!nouSheetsIdNorm || verificant"
              class="shrink-0 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              {{ verificant ? 'Verificant...' : 'Verificar' }}
            </button>
          </div>

          <!-- Resultat verificació -->
          <div v-if="resultatVerificacio" class="mt-3 rounded-md px-4 py-3 text-sm"
            :class="resultatVerificacio.ok
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'"
          >
            <span v-if="resultatVerificacio.ok">
              Connexió correcta — {{ resultatVerificacio.totalFiles }} classes trobades.
            </span>
            <span v-else>{{ resultatVerificacio.error }}</span>
          </div>
        </div>

        <!-- Confirmació / Guardar -->
        <div v-if="resultatVerificacio?.ok" class="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <div v-if="!confirmantSheets">
            <p class="text-sm text-slate-700">
              Nou ID verificat correctament.
            </p>
            <code class="text-xs font-mono text-slate-500">{{ nouSheetsIdNorm }}</code>
          </div>
          <div v-else class="text-sm text-slate-700">
            <p class="font-semibold">Confirmar el canvi?</p>
            <p class="mt-0.5 text-xs text-slate-500">L'ID anterior quedarà guardat com a còpia de seguretat.</p>
          </div>
          <div class="flex shrink-0 gap-2">
            <template v-if="!confirmantSheets">
              <button
                type="button"
                @click="confirmantSheets = true"
                class="rounded-md bg-[#0024B6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#001A8A]"
              >
                Guardar
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                @click="confirmantSheets = false"
                class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                @click="guardarSheets"
                :disabled="guardantSheets"
                class="rounded-md bg-[#0024B6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#001A8A] disabled:opacity-50"
              >
                {{ guardantSheets ? 'Guardant...' : 'Confirmar' }}
              </button>
            </template>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import { calcularQuotesGuardiesPati } from '../utils/guardiesPati';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_SHEETS_ID,
  subscribeAppSettings,
  updateAppSettings,
} from '../services/appSettings';
import { provarConnexioSheets } from '../services/sincronitzacio';

const cursStore = useCursStore();
const toast = useToastStore();
const formulari = reactive({ ...DEFAULT_APP_SETTINGS });
const professors = ref([]);
const guardant = ref(false);
let settingsUnsubscribe = null;
let professorsUnsubscribe = null;

// Sheets ID
const nouSheetsIdRaw = ref('');
const verificant = ref(false);
const resultatVerificacio = ref(null);
const confirmantSheets = ref(false);
const guardantSheets = ref(false);

function extreureSheetsId(raw) {
  const s = (raw || '').trim();
  const match = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : s;
}

const nouSheetsIdNorm = computed(() => extreureSheetsId(nouSheetsIdRaw.value));

watch(nouSheetsIdRaw, () => {
  resultatVerificacio.value = null;
  confirmantSheets.value = false;
});

async function verificarSheets() {
  if (!nouSheetsIdNorm.value || verificant.value) return;
  verificant.value = true;
  resultatVerificacio.value = null;
  confirmantSheets.value = false;
  resultatVerificacio.value = await provarConnexioSheets(nouSheetsIdNorm.value);
  verificant.value = false;
}

async function guardarSheets() {
  guardantSheets.value = true;
  try {
    const idAnterior = formulari.sheetsId || DEFAULT_SHEETS_ID;
    await updateAppSettings(cursStore.cursActiuId, {
      sheetsId: nouSheetsIdNorm.value,
      sheetsIdAnterior: idAnterior !== nouSheetsIdNorm.value ? idAnterior : formulari.sheetsIdAnterior,
    });
    nouSheetsIdRaw.value = '';
    resultatVerificacio.value = null;
    confirmantSheets.value = false;
    toast.ok('Full de càlcul actualitzat correctament.');
  } catch (err) {
    toast.error("No s'ha pogut guardar: " + (err.message || ''));
  } finally {
    guardantSheets.value = false;
  }
}

async function tornarAnterior() {
  if (!formulari.sheetsIdAnterior) return;
  guardantSheets.value = true;
  try {
    await updateAppSettings(cursStore.cursActiuId, {
      sheetsId: formulari.sheetsIdAnterior,
      sheetsIdAnterior: '',
    });
    toast.ok('ID anterior restaurat.');
  } catch (err) {
    toast.error("No s'ha pogut restaurar: " + (err.message || ''));
  } finally {
    guardantSheets.value = false;
  }
}

const totalGuardiesPatiFormulari = computed(() =>
  Math.max(0, Math.round(Number(formulari.totalGuardiesPati ?? 30) || 0))
);

const quotesGuardies = computed(() => {
  const quotes = calcularQuotesGuardiesPati(professors.value, totalGuardiesPatiFormulari.value);
  return Object.entries(quotes)
    .map(([departament, quota]) => ({ departament, quota }))
    .filter((item) => item.quota > 0)
    .sort((a, b) => a.departament.localeCompare(b.departament));
});

const totalPreviewAssignat = computed(() =>
  quotesGuardies.value.reduce((sum, item) => sum + item.quota, 0)
);

async function guardarGuardies() {
  guardant.value = true;
  try {
    await updateAppSettings(cursStore.cursActiuId, {
      totalGuardiesPati: totalGuardiesPatiFormulari.value,
    });
    toast.ok('Guàrdies de pati guardades.');
  } catch (err) {
    console.error('Error guardant guàrdies de pati:', err);
    toast.error("No s'han pogut guardar les guàrdies de pati.");
  } finally {
    guardant.value = false;
  }
}

watch(() => cursStore.cursActiuId, (cursId) => {
  settingsUnsubscribe?.();
  professorsUnsubscribe?.();
  settingsUnsubscribe = null;
  professorsUnsubscribe = null;

  if (!cursId) {
    Object.assign(formulari, DEFAULT_APP_SETTINGS);
    professors.value = [];
    return;
  }

  settingsUnsubscribe = subscribeAppSettings(cursId, (settings) => {
    Object.assign(formulari, settings);
  });
  professorsUnsubscribe = onSnapshot(query(cursStore.col('professors')), (snapshot) => {
    professors.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
  });
}, { immediate: true });

onUnmounted(() => {
  settingsUnsubscribe?.();
  professorsUnsubscribe?.();
});
</script>
