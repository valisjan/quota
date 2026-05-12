<template>
  <div class="max-w-2xl space-y-5">
    <!-- Crear curs nou -->
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="font-semibold text-slate-900">Crear curs nou</h3>
          <p class="mt-0.5 text-sm text-slate-500">Següent curs: <strong>{{ cursSegüent }}</strong></p>
        </div>
        <button
          @click="crearCurs"
          :disabled="!cursSegüent || creant || cursJaExisteix"
          class="shrink-0 rounded-lg bg-[#0024B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#001A8A] disabled:opacity-50"
        >
          {{ creant ? 'Creant...' : `Crear ${cursSegüent}` }}
        </button>
      </div>
      <p v-if="cursJaExisteix" class="mt-2 text-sm font-medium text-amber-600">
        Aquest curs ja existeix.
      </p>
    </div>

    <!-- Llista de cursos -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 class="font-semibold text-slate-900">Cursos</h3>
        <p class="mt-1 text-sm text-slate-500">Selecciona el curs actiu o bloqueja els tancats.</p>
      </div>

      <div v-if="cursStore.cursos.length === 0" class="p-5 text-sm text-slate-400">
        Encara no hi ha cap curs. Crea'n un per començar.
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="curs in cursStore.cursos"
          :key="curs.id"
          class="flex items-center justify-between px-5 py-4"
          :class="curs.id === cursStore.cursActiuId ? 'bg-emerald-50/40' : ''"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-900">{{ curs.nom || curs.id }}</span>
              <span
                v-if="curs.id === cursStore.cursActiuId"
                class="rounded-full bg-[#00BF33] px-2 py-0.5 text-[10px] font-semibold text-white"
              >actiu</span>
              <span
                v-if="curs.bloqueig"
                class="rounded-full bg-[#FF8040] px-2 py-0.5 text-[10px] font-semibold text-white"
              >bloquejat</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="curs.id !== cursStore.cursActiuId"
              @click="cursStore.canviarCursActiu(curs.id)"
              class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Establir com a actiu
            </button>
            <button
              @click="toggleBloqueig(curs)"
              class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
              :class="curs.bloqueig
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'"
            >
              {{ curs.bloqueig ? 'Desbloquejar' : 'Bloquejar' }}
            </button>
            <button
              v-if="curs.id !== cursStore.cursActiuId"
              @click="confirmarEliminació(curs)"
              :disabled="eliminant === curs.id"
              class="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {{ eliminant === curs.id ? '...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmació eliminació -->
    <div
      v-if="cursAEliminar"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="cursAEliminar = null"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h4 class="text-lg font-semibold text-slate-900">Eliminar curs</h4>
        <p class="mt-2 text-sm text-slate-600">
          Estàs a punt d'eliminar el curs
          <strong>{{ cursAEliminar.nom || cursAEliminar.id }}</strong>.
          Només elimina el curs si és buit (sense classes ni professors importats).
          Les subcol·leccions no s'eliminen automàticament.
        </p>
        <div class="mt-4 flex justify-end gap-3">
          <button
            @click="cursAEliminar = null"
            class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel·lar
          </button>
          <button
            @click="eliminarCurs(cursAEliminar)"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';

const cursStore = useCursStore();
const toast = useToastStore();
const creant = ref(false);
const eliminant = ref(null);
const cursAEliminar = ref(null);

const cursSegüent = computed(() => {
  if (cursStore.cursos.length === 0) return '2025/2026';
  const last = cursStore.cursos[0];
  const nom = last.nom || last.id.replace('-', '/');
  const match = nom.match(/(\d{4})\/(\d{4})/);
  if (!match) return '';
  const endYear = parseInt(match[2]);
  return `${endYear}/${endYear + 1}`;
});

const cursJaExisteix = computed(() =>
  !!cursSegüent.value && cursStore.cursos.some(
    (c) => c.nom === cursSegüent.value || c.id === cursSegüent.value.replace('/', '-')
  )
);

async function crearCurs() {
  if (!cursSegüent.value || cursJaExisteix.value) return;
  creant.value = true;
  try {
    await cursStore.crearCurs(cursSegüent.value);
    toast.ok(`Curs ${cursSegüent.value} creat correctament.`);
  } catch (e) {
    toast.error('Error creant el curs: ' + e.message);
  } finally {
    creant.value = false;
  }
}

async function toggleBloqueig(curs) {
  try {
    await cursStore.setBloqueig(curs.id, !curs.bloqueig);
    const accio = curs.bloqueig ? 'desbloquejat' : 'bloquejat';
    toast.ok(`${curs.nom || curs.id} ${accio}.`);
  } catch (e) {
    toast.error('Error: ' + e.message);
  }
}

function confirmarEliminació(curs) {
  cursAEliminar.value = curs;
}

async function eliminarCurs(curs) {
  eliminant.value = curs.id;
  cursAEliminar.value = null;
  try {
    await cursStore.eliminarCurs(curs.id);
    toast.ok(`Curs ${curs.nom || curs.id} eliminat.`);
  } catch (e) {
    toast.error('Error eliminant el curs: ' + e.message);
  } finally {
    eliminant.value = null;
  }
}
</script>
