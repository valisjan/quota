<template>
  <div class="max-w-3xl space-y-5">
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 class="text-2xl font-semibold text-slate-950">
        Mode tancament
      </h3>
      <p class="mt-2 text-base text-slate-600 dark:text-slate-300">
        Bloqueja les edicions quan el repartiment ja està revisat o pendent de passar a horaris.
      </p>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <label class="flex cursor-pointer items-start justify-between gap-4 p-5">
          <div>
            <p class="text-lg font-semibold text-slate-950">
              Bloquejar administració
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Les pantalles d'administració queden en mode lectura. Aquesta pantalla sempre queda disponible per desbloquejar.
            </p>
          </div>
          <input
            v-model="formulari.tancamentAdmin"
            type="checkbox"
            class="mt-1 h-6 w-6 rounded border-slate-300 text-[#0024B6] focus:ring-[#0024B6]"
          />
        </label>
      </div>

      <div class="border-t border-slate-200 p-5 dark:border-slate-700">
        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Missatge visible durant el tancament
          <textarea
            v-model="formulari.missatgeTancament"
            rows="3"
            class="form-input mt-2 w-full bg-white dark:bg-gray-900"
            placeholder="Ex.: Repartiment tancat pendent de validació final."
          ></textarea>
        </label>
      </div>

      <div class="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ estatText }}
        </p>
        <button
          @click="guardar"
          :disabled="guardant"
          class="rounded-md bg-[#00BF33] px-5 py-3 text-base font-medium text-white transition hover:bg-[#009928] disabled:opacity-50"
        >
          {{ guardant ? 'Guardant...' : 'Guardar configuració' }}
        </button>
      </div>
    </div>

    <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <h3 class="text-xl font-semibold text-slate-950">
          Tancament per departament
        </h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Els departaments poden tancar-se ells mateixos. Només l'administració pot desbloquejar-los.
        </p>
      </div>

      <div class="divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="departament in departamentsOrdenats"
          :key="departament.id"
          class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">
              {{ departament.nom }}
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              <span v-if="departament.tancat">
                Tancat per {{ infoDepartament(departament.nom).tancatPer || 'usuari' }}
                <span v-if="infoDepartament(departament.nom).tancatAt">
                  · {{ formatData(infoDepartament(departament.nom).tancatAt) }}
                </span>
              </span>
              <span v-else>Obert</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="departament.tancat"
              type="button"
              class="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              @click="desbloquejarDepartament(departament)"
            >
              Desbloqueja
            </button>
            <button
              v-else
              type="button"
              class="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
              @click="bloquejarDepartament(departament)"
            >
              Tanca
            </button>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, watch, onUnmounted, reactive, ref } from 'vue';
import { onSnapshot, query, updateDoc } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
  updateAppSettings,
} from '../services/appSettings';

const cursStore = useCursStore();
const toast = useToastStore();
const formulari = reactive({ ...DEFAULT_APP_SETTINGS });
const departaments = ref([]);
const guardant = ref(false);
let unsubscribe = null;
let departamentsUnsubscribe = null;

const estatText = computed(() => {
  if (formulari.tancamentAdmin) return 'Administració bloquejada.';
  return 'Administració oberta. Els departaments es gestionen individualment.';
});

const departamentsOrdenats = computed(() =>
  [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom))
);

async function guardar() {
  guardant.value = true;
  try {
    await updateAppSettings(cursStore.cursActiuId, {
      tancamentAdmin: formulari.tancamentAdmin,
      missatgeTancament: formulari.missatgeTancament,
    });
    toast.ok('Configuració guardada.');
  } catch (err) {
    console.error('Error guardant configuració:', err);
    toast.error("No s'ha pogut guardar la configuració.");
  } finally {
    guardant.value = false;
  }
}

function infoDepartament(nom) {
  return departaments.value.find((departament) => departament.nom === nom) || null;
}

function formatData(value) {
  return new Date(value).toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function bloquejarDepartament(departament) {
  try {
    await updateDoc(cursStore.docRef('departaments', departament.id), {
      tancat: true,
      tancatPer: 'Administració',
      tancatAt: new Date().toISOString(),
    });
    toast.ok(`${departament.nom} tancat.`);
  } catch (err) {
    console.error('Error tancant departament:', err);
    toast.error("No s'ha pogut tancar el departament.");
  }
}

async function desbloquejarDepartament(departament) {
  try {
    await updateDoc(cursStore.docRef('departaments', departament.id), {
      tancat: false,
      tancatPer: '',
      tancatAt: '',
    });
    toast.ok(`${departament.nom} desbloquejat.`);
  } catch (err) {
    console.error('Error desbloquejant departament:', err);
    toast.error("No s'ha pogut desbloquejar el departament.");
  }
}

watch(() => cursStore.cursActiuId, () => {
  unsubscribe?.();
  departamentsUnsubscribe?.();
  unsubscribe = null;
  departamentsUnsubscribe = null;
  if (!cursStore.cursActiuId) {
    Object.assign(formulari, DEFAULT_APP_SETTINGS);
    departaments.value = [];
    return;
  }
  unsubscribe = subscribeAppSettings(cursStore.cursActiuId, (settings) => {
    Object.assign(formulari, settings);
  });
  departamentsUnsubscribe = onSnapshot(query(cursStore.col('departaments')), (snapshot) => {
    departaments.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
  });
}, { immediate: true });

onUnmounted(() => {
  unsubscribe?.();
  departamentsUnsubscribe?.();
});
</script>
