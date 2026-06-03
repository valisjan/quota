<template>
  <div class="space-y-5">
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="font-semibold text-slate-900">Crear curs acadèmic</h3>
          <p class="mt-0.5 text-sm text-slate-500">
            Següent curs: <strong>{{ cursSeguent }}</strong>
          </p>
        </div>
        <button
          @click="crearCurs"
          :disabled="!cursSeguent || creant || cursJaExisteix"
          class="shrink-0 rounded-lg bg-[#0024B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#001A8A] disabled:opacity-50"
        >
          {{ creant ? 'Creant...' : `Crear ${cursSeguent}` }}
        </button>
      </div>
      <p v-if="cursJaExisteix" class="mt-2 text-sm font-medium text-amber-600">
        Aquest curs ja existeix.
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 class="font-semibold text-slate-900">Curs acadèmic</h3>
        <p class="mt-1 text-sm text-slate-500">
          Selecciona el curs actiu, bloqueja els tancats o elimina completament un curs de proves.
        </p>
      </div>

      <div v-if="cursStore.cursos.length === 0" class="p-5 text-sm text-slate-400">
        Encara no hi ha cap curs. Crea'n un per començar.
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="curs in cursStore.cursos"
          :key="curs.id"
          class="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
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

          <div class="flex flex-wrap items-center gap-2">
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
              @click="confirmarBorratTotal(curs)"
              :disabled="eliminant === curs.id"
              class="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {{ eliminant === curs.id ? 'Esborrant...' : 'Borrat total' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="cursABorrarTotal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="tancarBorratTotal"
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 class="text-lg font-semibold text-red-700">Borrat total del curs acadèmic</h4>
        <p class="mt-2 text-sm text-slate-600">
          Aquesta acció eliminarà definitivament el curs
          <strong>{{ cursABorrarTotal.nom || cursABorrarTotal.id }}</strong>
          i tots els seus rastres: classes, professorat, departaments, historial de sincronització,
          presència, configuració i mapeig Untis del curs.
        </p>
        <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <input
            v-model="eliminarPreautoritzats"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            :disabled="Boolean(eliminant)"
          />
          <span>
            Eliminar també les preautoritzacions globals dels professors d'aquest curs.
            No elimina comptes d'usuari ja creats.
          </span>
        </label>
        <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No es pot desfer. Escriu exactament
          <strong>{{ textConfirmacioBorrat }}</strong>
          per activar el botó de borrat.
        </div>
        <input
          v-model="confirmacioBorratTotal"
          type="text"
          class="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          :placeholder="textConfirmacioBorrat"
          @keyup.enter="potConfirmarBorrat && eliminarCurs(cursABorrarTotal)"
        />
        <div class="mt-5 flex justify-end gap-3">
          <button
            @click="tancarBorratTotal"
            :disabled="Boolean(eliminant)"
            class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel·lar
          </button>
          <button
            @click="eliminarCurs(cursABorrarTotal)"
            :disabled="!potConfirmarBorrat || eliminant === cursABorrarTotal.id"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ eliminant === cursABorrarTotal.id ? 'Esborrant...' : 'Esborrar-ho tot' }}
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
const cursABorrarTotal = ref(null);
const confirmacioBorratTotal = ref('');
const eliminarPreautoritzats = ref(true);

const cursSeguent = computed(() => {
  if (cursStore.cursos.length === 0) return '2025/2026';
  const last = cursStore.cursos[0];
  const nom = last.nom || last.id.replace('-', '/');
  const match = nom.match(/(\d{4})\/(\d{4})/);
  if (!match) return '';
  const endYear = parseInt(match[2]);
  return `${endYear}/${endYear + 1}`;
});

const cursJaExisteix = computed(() =>
  !!cursSeguent.value && cursStore.cursos.some(
    (c) => c.nom === cursSeguent.value || c.id === cursSeguent.value.replace('/', '-')
  )
);

const textConfirmacioBorrat = computed(() =>
  cursABorrarTotal.value ? (cursABorrarTotal.value.nom || cursABorrarTotal.value.id) : ''
);

const potConfirmarBorrat = computed(() =>
  confirmacioBorratTotal.value.trim() === textConfirmacioBorrat.value
);

async function crearCurs() {
  if (!cursSeguent.value || cursJaExisteix.value) return;
  creant.value = true;
  try {
    await cursStore.crearCurs(cursSeguent.value);
    toast.ok(`Curs ${cursSeguent.value} creat correctament.`);
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

function confirmarBorratTotal(curs) {
  cursABorrarTotal.value = curs;
  confirmacioBorratTotal.value = '';
  eliminarPreautoritzats.value = true;
}

function tancarBorratTotal() {
  if (eliminant.value) return;
  cursABorrarTotal.value = null;
  confirmacioBorratTotal.value = '';
  eliminarPreautoritzats.value = true;
}

async function eliminarCurs(curs) {
  if (!curs || !potConfirmarBorrat.value) return;
  const etiqueta = curs.nom || curs.id;
  eliminant.value = curs.id;
  try {
    const resum = await cursStore.eliminarCurs(curs.id, {
      eliminarPreautoritzats: eliminarPreautoritzats.value,
    });
    const registres = Math.max((resum?.total || 1) - 1, 0);
    toast.ok(`Curs ${etiqueta} esborrat. S'han eliminat ${registres} registres associats.`);
    cursABorrarTotal.value = null;
    confirmacioBorratTotal.value = '';
    eliminarPreautoritzats.value = true;
  } catch (e) {
    toast.error('Error esborrant el curs: ' + e.message);
  } finally {
    eliminant.value = null;
  }
}
</script>
