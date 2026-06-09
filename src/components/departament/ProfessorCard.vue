<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 dark:border-slate-600 dark:bg-slate-800">

    <!-- Capçalera: nom + hores -->
    <div class="px-4 pt-3 pb-2">
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-base font-semibold leading-tight text-slate-950 dark:text-white">{{ professor.nom }}</h4>
        <span class="shrink-0 rounded-md px-2 py-0.5 text-sm font-bold" :class="horesBadgeClass">
          {{ totalHoresProfessor }}h
        </span>
      </div>

      <!-- Barra de progrés -->
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          class="h-full rounded-full transition-all"
          :class="barraClass"
          :style="{ width: `${Math.min(100, (totalHoresProfessor / limits.ideal) * 100)}%` }"
        />
      </div>

      <!-- Estat + etiquetes -->
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span class="text-xs font-semibold" :class="estatTextClass">{{ estatText }}</span>
        <span v-if="professor.jornada" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {{ textJornada(professor) }}
        </span>
        <span v-if="professor.preferencia" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {{ professor.preferencia === 'pronto' ? '↑ Prest' : '↓ Tard' }}
        </span>
      </div>
    </div>

    <!-- Matèries -->
    <div class="border-t border-slate-100 px-3 py-2 dark:border-slate-700">
      <div v-if="classes.length === 0" class="py-1 text-center text-xs italic text-slate-400">
        Sense matèries assignades
      </div>
      <div v-else class="space-y-0.5">
        <div
          v-for="classe in classes"
          :key="classe.id"
          class="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <span class="w-14 shrink-0 font-mono text-slate-400">{{ classe.curs }} {{ classe.grup }}</span>
          <span class="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">{{ classe.materia }}</span>
          <span v-if="classe.tipus" class="shrink-0 rounded bg-slate-100 px-1 text-slate-500 dark:bg-slate-700 dark:text-slate-400">{{ classe.tipus }}</span>
          <span v-if="rolClasse(classe)" class="shrink-0 text-[10px] italic text-slate-400">{{ rolClasse(classe) }}</span>
          <span class="shrink-0 w-6 text-right font-semibold text-slate-600 dark:text-slate-300">{{ horesComputablesClasse(classe) }}h</span>
          <button
            type="button"
            class="shrink-0 rounded px-1 text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            :disabled="bloquejat"
            :aria-label="`Desassignar ${classe.materia}`"
            @click="$emit('desassignar-classe', { professor, classe })"
          >×</button>
        </div>
      </div>
    </div>

    <!-- GP i PALIC: discrets, inline -->
    <div
      v-if="mostraGp || totalPalicDepartament > 0"
      class="flex flex-wrap gap-3 border-t border-slate-100 bg-surface-soft px-4 py-2 dark:border-slate-700"
    >
      <div v-if="mostraGp" class="flex items-center gap-1.5">
        <span class="text-xs font-medium text-slate-500">Guàrdies de pati</span>
        <button
          type="button"
          class="h-5 w-5 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:border-slate-300 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          :disabled="bloquejat || horesGp === 0"
          @click="$emit('decrementar-gp', professor)"
        >−</button>
        <span class="w-4 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{{ horesGp }}</span>
        <button
          type="button"
          class="h-5 w-5 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:border-slate-300 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          :disabled="bloquejat || totalGpAssignades >= totalGpDepartament"
          @click="$emit('incrementar-gp', professor)"
        >+</button>
      </div>
      <div v-if="totalPalicDepartament > 0" class="flex items-center gap-1.5">
        <span class="text-xs font-medium text-slate-500">PALIC</span>
        <button
          type="button"
          class="h-5 w-5 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:border-slate-300 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          :disabled="bloquejat || horesPalic === 0"
          @click="$emit('decrementar-palic', professor)"
        >−</button>
        <span class="w-4 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{{ horesPalic }}</span>
        <button
          type="button"
          class="h-5 w-5 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:border-slate-300 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          :disabled="bloquejat || totalPalicAssignades >= totalPalicDepartament"
          @click="$emit('incrementar-palic', professor)"
        >+</button>
      </div>
    </div>

    <!-- Seccions col·lapsables -->
    <div class="border-t border-slate-100 bg-surface-soft dark:border-slate-700">

      <!-- Comissions -->
      <div v-if="coordinacions.length > 0">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/40"
          @click="mostrarComissions = !mostrarComissions"
        >
          <span>Comissions{{ coordinacionsProfessor.length ? ` (${coordinacionsProfessor.length})` : '' }}</span>
          <span class="text-slate-300">{{ mostrarComissions ? '▲' : '▼' }}</span>
        </button>
        <div v-if="mostrarComissions" class="px-3 pb-3">
          <div v-if="coordinacionsProfessor.length" class="mb-2 space-y-1">
            <div
              v-for="c in coordinacionsProfessor"
              :key="c.id"
              class="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs dark:bg-slate-700/40"
            >
              <span class="text-slate-800 dark:text-slate-200">{{ c.materia }}
                <span class="text-slate-400">· {{ esCoordinador(c) ? 'coord.' : 'membre' }}</span>
              </span>
              <button
                v-if="!esCoordinador(c)"
                type="button"
                class="text-slate-400 hover:text-red-500 disabled:opacity-30"
                :disabled="bloquejat"
                @click="$emit('toggle-coordinacio', { professor, coordinacio: c, participa: false })"
              >×</button>
            </div>
          </div>
          <div v-if="coordinacionsDisponibles.length">
            <select
              v-model="coordinacionsSeleccionades"
              multiple
              :size="Math.min(4, coordinacionsDisponibles.length)"
              :disabled="bloquejat"
              class="form-input w-full py-1 text-xs"
            >
              <option v-for="c in coordinacionsDisponibles" :key="c.id" :value="c.id">{{ c.materia }}</option>
            </select>
            <button
              type="button"
              class="mt-2 w-full rounded-md bg-success py-1 text-xs font-semibold text-white disabled:opacity-40 hover:bg-success-dark"
              :disabled="bloquejat || coordinacionsSeleccionades.length === 0"
              @click="afegirCoordinacions"
            >Afegeix seleccionades</button>
          </div>
        </div>
      </div>

      <!-- Preferències i comentaris -->
      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/40"
        @click="mostrarPreferencies = !mostrarPreferencies"
      >
        <span>Preferències i comentaris</span>
        <span class="text-slate-300">{{ mostrarPreferencies ? '▲' : '▼' }}</span>
      </button>
      <div v-if="mostrarPreferencies" class="space-y-3 px-4 pb-4">
        <label class="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Horari preferit
          <select
            :value="professor.preferencia"
            @change="updatePreferencia($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full py-1.5 text-xs"
          >
            <option value="">Sense preferència</option>
            <option value="pronto">Entrar prest</option>
            <option value="tarde">Entrar tard</option>
          </select>
        </label>
        <label v-if="professor.preferencia" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Motiu al·legat
          <textarea
            :value="professor.motiuAllegat"
            @input="updateMotiuAllegat($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full text-xs"
            rows="2"
          />
        </label>
        <label class="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Comentaris
          <textarea
            :value="professor.comentaris"
            @input="updateComentaris($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full text-xs"
            rows="2"
          />
        </label>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { horesComputablesClasse, limitsHoresProfessor, textJornada } from '../../utils/horesProfessor';

const props = defineProps({
  professor: { type: Object, required: true },
  classes: { type: Array, default: () => [] },
  horesLectives: { type: Number, default: 0 },
  horesGp: { type: Number, default: 0 },
  horesPalic: { type: Number, default: 0 },
  mostraGp: { type: Boolean, default: true },
  totalGpDepartament: { type: Number, default: 0 },
  totalGpAssignades: { type: Number, default: 0 },
  totalPalicDepartament: { type: Number, default: 0 },
  totalPalicAssignades: { type: Number, default: 0 },
  coordinacions: { type: Array, default: () => [] },
  bloquejat: { type: Boolean, default: false },
});

const emit = defineEmits([
  'actualitzar-professor',
  'incrementar-gp',
  'decrementar-gp',
  'incrementar-palic',
  'decrementar-palic',
  'toggle-coordinacio',
  'desassignar-classe',
]);

const mostrarComissions = ref(false);
const mostrarPreferencies = ref(false);
const coordinacionsSeleccionades = ref([]);
const bloquejat = computed(() => props.bloquejat);

const totalHoresProfessor = computed(() => props.horesLectives + props.horesPalic);
const limits = computed(() => limitsHoresProfessor(props.professor));

const isPerfectHours = computed(() => totalHoresProfessor.value === limits.value.ideal);
const isOverRecommended = computed(() =>
  totalHoresProfessor.value > limits.value.ideal && totalHoresProfessor.value <= limits.value.maxim
);
const isOverLimit = computed(() => totalHoresProfessor.value > limits.value.maxim);
const isEmpty = computed(() => totalHoresProfessor.value === 0);


const barraClass = computed(() => {
  if (isOverLimit.value) return 'bg-red-400';
  if (isOverRecommended.value) return 'bg-orange-400';
  if (isPerfectHours.value) return 'bg-emerald-400';
  if (isEmpty.value) return 'bg-slate-200';
  return 'bg-primary';
});

const horesBadgeClass = computed(() => {
  if (isOverLimit.value) return 'bg-slate-100 text-red-600 dark:bg-slate-700 dark:text-red-400';
  if (isOverRecommended.value) return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  if (isPerfectHours.value) return 'bg-slate-100 text-emerald-600 dark:bg-slate-700 dark:text-emerald-400';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
});

const estatTextClass = computed(() => {
  if (isOverLimit.value) return 'text-red-600 dark:text-red-400';
  if (isOverRecommended.value) return 'text-orange-600 dark:text-orange-400';
  if (isPerfectHours.value) return 'text-emerald-600 dark:text-emerald-400';
  if (isEmpty.value) return 'text-slate-400';
  return 'text-primary';
});

const estatText = computed(() => {
  const diff = totalHoresProfessor.value - limits.value.ideal;
  if (isOverLimit.value) return `+${diff}h (sobre màxim)`;
  if (isOverRecommended.value) return `+${diff}h`;
  if (isPerfectHours.value) return '✓ Complet';
  if (isEmpty.value) return 'Sense hores';
  if (diff < 0) return `Falta ${Math.abs(diff)}h`;
  return `${totalHoresProfessor.value}h`;
});

const coordinacionsProfessor = computed(() =>
  props.coordinacions.filter((c) => esCoordinador(c) || participaEnCoordinacio(c))
);
const coordinacionsDisponibles = computed(() =>
  props.coordinacions.filter((c) => !esCoordinador(c) && !participaEnCoordinacio(c))
);

function participaEnCoordinacio(c) {
  return (c.participants || []).includes(props.professor.nom);
}
function esCoordinador(c) {
  return c.professorAssignat === props.professor.nom;
}
function rolClasse(classe) {
  if (classe.professorAssignat === props.professor.nom) return '';
  if ((classe.professors || []).includes(props.professor.nom)) return 'codocent';
  return '';
}

function afegirCoordinacions() {
  if (props.bloquejat) return;
  props.coordinacions
    .filter((c) => coordinacionsSeleccionades.value.includes(c.id))
    .forEach((c) => emit('toggle-coordinacio', { professor: props.professor, coordinacio: c, participa: true }));
  coordinacionsSeleccionades.value = [];
}

function updatePreferencia(value) {
  if (props.bloquejat) return;
  emit('actualitzar-professor', { ...props.professor, preferencia: value });
}
function updateMotiuAllegat(value) {
  if (props.bloquejat) return;
  emit('actualitzar-professor', { ...props.professor, motiuAllegat: value });
}
function updateComentaris(value) {
  if (props.bloquejat) return;
  emit('actualitzar-professor', { ...props.professor, comentaris: value });
}
</script>

<script>
export default { name: 'ProfessorCard' };
</script>
