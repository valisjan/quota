<template>
  <div class="max-w-4xl">
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
  subscribeAppSettings,
  updateAppSettings,
} from '../services/appSettings';

const cursStore = useCursStore();
const toast = useToastStore();
const formulari = reactive({ ...DEFAULT_APP_SETTINGS });
const professors = ref([]);
const guardant = ref(false);
let settingsUnsubscribe = null;
let professorsUnsubscribe = null;

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
