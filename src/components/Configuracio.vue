<template>
  <div class="sections space-y-6">
    <AdminSectionNav v-model="activeSection" :items="sectionItems" mode="panels" />

    <section v-show="activeSection === 'guardies-pati'" id="guardies-pati" class="admin-anchor-section card">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-bold text-slate-950">
          Guàrdies de pati
        </h3>
        <p class="mt-1 text-sm text-slate-600">
          Es distribueixen proporcionalment entre els departaments segons els membres efectius. Pots excloure departaments o reduir el nombre de membres comptables (director, orientador, PSC…).
        </p>
      </div>

      <div class="space-y-5 p-5">
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

    <section v-show="activeSection === 'guardies-passadis'" id="guardies-passadis" class="admin-anchor-section card">
      <div class="border-b border-slate-200 p-5">
        <h3 class="text-xl font-bold text-slate-950">Guàrdies</h3>
        <p class="mt-1 text-sm text-slate-600">
          Cada professor fa 4 guàrdies (2 si és tutor). Exempts: departaments d'Agrària i Indústries Alimentàries (automàtic) i professors amb dedicació a equip directiu o orientació (manual).
          El llistat mostra les guàrdies de passadís pendents, les guàrdies de pati i les de convivència. Reduccions: membre d'una comissió −1 com a màxim, cada GP −1, cada GC −1. A Untis, passadís i convivència s'exporten com a descripció <code class="rounded bg-slate-100 px-1">G</code>; pati s'exporta com a <code class="rounded bg-slate-100 px-1">GP</code>.
        </p>
      </div>

      <div class="divide-y divide-slate-100">
        <div
          v-for="prof in professorsAmbGuardes"
          :key="prof.id"
          class="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          :class="prof.exempt ? 'opacity-50' : ''"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-950">{{ prof.nom }}</span>
              <span class="text-xs text-slate-500">{{ prof.departament }}</span>
              <span
                v-for="motiu in prof.motius"
                :key="motiu"
                class="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500"
              >{{ motiu }}</span>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:min-w-[22rem]">
            <span
              class="inline-flex min-w-24 justify-center rounded-md px-2.5 py-1 text-sm font-bold"
              :class="prof.guardes === 0 ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-800'"
            >
              {{ prof.guardes === 0 ? 'Passadís 0' : `Passadís ${prof.guardes}` }}
            </span>
            <span
              class="inline-flex min-w-20 justify-center rounded-md px-2.5 py-1 text-sm font-bold"
              :class="prof.gpAssignades > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-400'"
            >
              Pati {{ prof.gpAssignades || 0 }}
            </span>
            <span
              class="inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 text-sm font-bold"
              :class="prof.gcAssignades > 0 ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-400'"
            >
              GC {{ prof.gcAssignades || 0 }}
            </span>
            <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                :checked="prof.exempteGuardies"
                @change="toggleExempteGuardies(prof, $event.target.checked)"
                class="h-4 w-4 rounded border-slate-300 accent-primary"
              />
              Exempt manual
            </label>
          </div>
        </div>
        <div v-if="!professorsAmbGuardes.length" class="px-5 py-8 text-center text-sm text-slate-500">
          Aquest curs encara no té professorat. Afegeix-lo a Professorat.
        </div>
      </div>

      <div class="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
        Total passadís pendents: <strong>{{ totalGuardesPrevistes }}</strong>
        · Total pati assignades: <strong>{{ totalGuardiesPatiAssignades }}</strong>
        · Total convivència assignades: <strong>{{ totalGuardiesConvivenciaAssignades }}</strong>
        · Professors exempts: <strong>{{ professorsExempts }}</strong>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { updateDoc } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import { calcularQuotesGuardiesPati, departamentFaGuardiesPati } from '../utils/guardiesPati';
import { guardesQueTocaFer, motiusReduccio } from '../utils/guardes';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
  updateAppSettings,
} from '../services/appSettings';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import AdminSectionNav from './AdminSectionNav.vue';

const cursStore = useCursStore();
const toast = useToastStore();
const formulari = reactive({ ...DEFAULT_APP_SETTINGS });
const guardant = ref(false);
const activeSection = ref('guardies-pati');
let settingsUnsubscribe = null;

const { items: professors } = useCursCollectionSnapshot({ colName: 'professors' });
const { items: classes } = useCursCollectionSnapshot({ colName: 'classes' });

const sectionItems = [
  {
    id: 'guardies-pati',
    label: 'Guàrdies de pati',
    description: 'Quotes per departament',
  },
  {
    id: 'guardies-passadis',
    label: 'Guàrdies',
    description: 'Passadís, pati i convivència',
  },
];

const professorsAmbGuardes = computed(() =>
  [...professors.value]
    .filter((p) => !p.eliminatDelFull)
    .sort((a, b) => (a.departament || '').localeCompare(b.departament || '', 'ca') || (a.nom || '').localeCompare(b.nom || '', 'ca'))
    .map((prof) => ({
      ...prof,
      guardes: guardesQueTocaFer(prof, classes.value),
      motius: motiusReduccio(prof, classes.value),
      gpAssignades: Math.max(0, Number(prof.gpAssignades || 0)),
      gcAssignades: Math.max(0, Number(prof.gcAssignades || 0)),
      exempt: prof.exempteGuardies || false,
    }))
);

const totalGuardesPrevistes = computed(() =>
  professorsAmbGuardes.value.reduce((s, p) => s + p.guardes, 0)
);

const professorsExempts = computed(() =>
  professorsAmbGuardes.value.filter((p) => p.guardes === 0).length
);

const totalGuardiesPatiAssignades = computed(() =>
  professorsAmbGuardes.value.reduce((s, p) => s + p.gpAssignades, 0)
);

const totalGuardiesConvivenciaAssignades = computed(() =>
  professorsAmbGuardes.value.reduce((s, p) => s + p.gcAssignades, 0)
);

async function toggleExempteGuardies(prof, valor) {
  try {
    await updateDoc(cursStore.docRef('professors', prof.id), { exempteGuardies: valor });
    toast.ok(`${prof.nom} ${valor ? 'marcat com a exempt' : 'inclòs a les guàrdies'}.`);
  } catch (err) {
    toast.error("No s'ha pogut actualitzar: " + err.message);
  }
}

const totalGuardiesPatiFormulari = computed(() =>
  Math.max(0, Math.round(Number(formulari.totalGuardiesPati ?? 30) || 0))
);

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
  settingsUnsubscribe = null;

  if (!cursId) {
    Object.assign(formulari, DEFAULT_APP_SETTINGS);
    return;
  }

  settingsUnsubscribe = subscribeAppSettings(cursId, (settings) => {
    Object.assign(formulari, settings);
  });
}, { immediate: true });

onUnmounted(() => {
  settingsUnsubscribe?.();
});
</script>
