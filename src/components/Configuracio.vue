<template>
  <div class="sections space-y-6">
    <section class="card">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-bold text-slate-950">
          Guàrdies de pati
        </h3>
        <p class="mt-1 text-sm text-slate-600">
          Es distribueixen proporcionalment entre els departaments segons els membres efectius. Pots excloure departaments o reduir el nombre de membres comptables (director, orientador, PSC…).
        </p>
      </div>

      <div class="space-y-5 p-5">
        <!-- Total -->
        <label class="block w-48 text-sm font-semibold text-slate-700">
          Total de guàrdies de pati
          <input
            v-model.number="formulari.totalGuardiesPati"
            type="number"
            min="0"
            step="1"
            class="form-input mt-2 w-full text-lg font-semibold"
          />
        </label>

        <!-- Departaments participants -->
        <div>
          <p class="mb-2 text-sm font-semibold text-slate-700">Departaments participants</p>
          <div class="grid gap-1.5 sm:grid-cols-2">
            <div
              v-for="item in departamentsGP"
              :key="item.dept"
              class="flex items-center gap-2.5 rounded-md px-3 py-2 ring-1 transition-colors"
              :class="item.excloit ? 'bg-slate-50 ring-slate-200 opacity-60' : 'bg-white ring-slate-200'"
            >
              <input
                type="checkbox"
                :id="`gp-${item.dept}`"
                :checked="!item.excloit"
                @change="toggleExclusio(item.dept)"
                class="h-4 w-4 shrink-0 rounded border-slate-300 accent-primary"
              />
              <label :for="`gp-${item.dept}`" class="min-w-0 flex-1 cursor-pointer">
                <span class="block truncate text-sm font-medium text-slate-800">{{ item.dept }}</span>
                <span class="text-xs text-slate-500">{{ item.membres }} prof.</span>
              </label>
              <div v-if="!item.excloit" class="flex shrink-0 items-center gap-1.5">
                <label :for="`red-${item.dept}`" class="text-xs text-slate-500">−</label>
                <input
                  :id="`red-${item.dept}`"
                  type="number"
                  min="0"
                  :max="item.membres"
                  :value="item.reduccio"
                  @change="setReduccio(item.dept, $event.target.valueAsNumber)"
                  class="w-12 rounded border border-slate-200 px-1.5 py-0.5 text-center text-sm focus:border-primary focus:outline-none"
                  :title="`Membres exclosos de GP (director, orientador…)`"
                />
                <span v-if="item.reduccio > 0" class="text-xs text-slate-500">= {{ item.efectius }} ef.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribució prevista -->
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-800">
              Distribució prevista
            </p>
            <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
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
          <p v-else class="text-sm text-slate-600">
            No hi ha professorat computable per distribuir guàrdies.
          </p>

          <div class="mt-4 flex justify-end">
            <button
              type="button"
              @click="guardarGuardies"
              :disabled="guardant"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ guardant ? 'Guardant...' : 'Guardar guàrdies' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Secció: Full de càlcul -->
    <section class="card">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-bold text-slate-950">Full de càlcul (Google Sheets)</h3>
        <p class="mt-1 text-sm text-slate-600">
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
            class="mt-3 text-sm font-semibold text-amber-900 underline hover:text-amber-900 disabled:opacity-50"
          >
            Tornar a l'ID anterior
          </button>
        </div>

        <!-- Canviar ID -->
        <div>
          <p class="text-sm font-semibold text-slate-700">Canviar ID</p>
          <p class="mt-0.5 text-xs text-slate-600">Enganxa l'ID o la URL completa del full.</p>
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
            <code class="text-xs font-mono text-slate-600">{{ nouSheetsIdNorm }}</code>
          </div>
          <div v-else class="text-sm text-slate-700">
            <p class="font-semibold">Confirmar el canvi?</p>
            <p class="mt-0.5 text-xs text-slate-600">L'ID anterior quedarà guardat com a còpia de seguretat.</p>
          </div>
          <div class="flex shrink-0 gap-2">
            <template v-if="!confirmantSheets">
              <button
                type="button"
                @click="confirmantSheets = true"
                class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
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
                class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
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
import { calcularQuotesGuardiesPati, departamentFaGuardiesPati } from '../utils/guardiesPati';
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

// Tots els departaments del professorat, ordenats
const departamentsGP = computed(() => {
  const depts = [...new Set(professors.value.map((p) => p.departament).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  return depts.map((dept) => {
    const membres = professors.value.filter((p) => p.departament === dept).length;
    const excloit = Array.isArray(formulari.gpExclusions)
      ? formulari.gpExclusions.includes(dept)
      : !departamentFaGuardiesPati(dept, null);
    const reduccio = Math.max(0, Number((formulari.gpReductions || {})[dept] || 0));
    const efectius = Math.max(0, membres - reduccio);
    return { dept, membres, excloit, reduccio, efectius };
  });
});

function getExclosionsActuals() {
  if (Array.isArray(formulari.gpExclusions)) return [...formulari.gpExclusions];
  // Primera vegada: inicialitzar des de l'estat visual actual (exclusions per defecte)
  return departamentsGP.value.filter((d) => d.excloit).map((d) => d.dept);
}

function toggleExclusio(departament) {
  if (!Array.isArray(formulari.gpExclusions)) {
    formulari.gpExclusions = getExclosionsActuals();
  }
  const idx = formulari.gpExclusions.indexOf(departament);
  if (idx === -1) formulari.gpExclusions.push(departament);
  else formulari.gpExclusions.splice(idx, 1);
}

function setReduccio(departament, valor) {
  if (!formulari.gpReductions) formulari.gpReductions = {};
  const val = Math.max(0, Math.round(Number(valor) || 0));
  if (val === 0) delete formulari.gpReductions[departament];
  else formulari.gpReductions[departament] = val;
}

const gpOptionsPreview = computed(() => ({
  gpExclusions: Array.isArray(formulari.gpExclusions) ? formulari.gpExclusions : null,
  gpReductions: formulari.gpReductions || {},
}));

const quotesGuardies = computed(() => {
  const quotes = calcularQuotesGuardiesPati(professors.value, totalGuardiesPatiFormulari.value, gpOptionsPreview.value);
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
      gpExclusions: getExclosionsActuals(),
      gpReductions: formulari.gpReductions || {},
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
