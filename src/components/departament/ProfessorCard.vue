<template>
  <div
    class="app-card professor-card overflow-hidden transition-all duration-200"
    :data-validation-professor="professor.nom"
    tabindex="-1"
  >

    <!-- Capçalera: nom + hores -->
    <div class="app-card-header px-4 pb-2 pt-3">
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-lg font-semibold leading-tight text-text-main">{{ professor.nom }}</h4>
        <span class="shrink-0 rounded-md px-2.5 py-1 text-lg font-black leading-none" :class="horesBadgeClass">
          {{ totalHoresProfessor }}h
        </span>
      </div>

      <!-- Barra de progrés -->
      <div class="app-progress-track mt-2 h-1.5 rounded-full">
        <div
          class="h-full rounded-full transition-all"
          :class="barraClass"
          :style="{ width: `${Math.min(100, (totalHoresProfessor / limits.ideal) * 100)}%` }"
        />
      </div>

      <!-- Estat + etiquetes -->
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span class="text-sm font-semibold" :class="estatTextClass">{{ estatText }}</span>
        <span v-if="professor.jornada" class="app-chip px-1.5 py-0.5 text-xs font-medium">
          {{ textJornada(professor) }}
        </span>
        <span v-if="professor.preferencia" class="app-chip px-1.5 py-0.5 text-xs font-medium">
          {{ professor.preferencia === 'pronto' ? '↑ Prest' : '↓ Tard' }}
        </span>
        <span v-if="guardesPrevistes !== null" class="app-chip px-1.5 py-0.5 text-xs font-medium"
          :class="guardesPrevistes === 0 ? 'bg-slate-100 text-slate-400' : ''">
          {{ guardesPrevistes === 0 ? 'Exempt G' : `${guardesPrevistes}G` }}
        </span>
      </div>
    </div>

    <!-- Matèries -->
    <div class="border-t border-border-soft px-3 py-2">
      <div v-if="classes.length === 0" class="py-1 text-center text-sm italic text-text-muted">
        Sense matèries assignades
      </div>
      <div v-else class="space-y-0.5">
        <div
          v-for="classe in classes"
          :key="classe.id"
          class="flex items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-surface-hover"
        >
          <span class="w-16 shrink-0 font-mono text-text-muted">{{ classe.curs }} {{ classe.grup }}</span>
          <span class="min-w-0 flex-1 truncate font-medium text-text-main">{{ classe.materia }}</span>
          <span v-if="classe.tipus" class="app-chip shrink-0 px-1.5 py-0 text-xs">{{ classe.tipus }}</span>
          <span v-if="rolClasse(classe)" class="shrink-0 text-xs italic text-text-muted">{{ rolClasse(classe) }}</span>
          <span class="w-8 shrink-0 text-right font-semibold text-text-secondary">{{ horesComputablesClasse(classe) }}h</span>
          <button
            type="button"
            class="shrink-0 rounded px-1 text-text-muted hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
            :disabled="bloquejat"
            :aria-label="`Desassignar ${classe.materia}`"
            @click="$emit('desassignar-classe', { professor, classe })"
          >×</button>
        </div>
      </div>
    </div>

    <!-- GP, PALIC i GC: discrets, inline -->
    <div
      v-if="mostraGp || totalPalicDepartament > 0 || mostraGc"
      class="flex flex-wrap gap-3 border-t border-border-soft bg-surface-soft px-4 py-2"
    >
      <div v-if="mostraGp" class="flex items-center gap-1.5">
        <span class="text-sm font-medium text-text-muted">Guàrdies de pati</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGp === 0"
          @click="$emit('decrementar-gp', professor)"
        >−</button>
        <span class="w-4 text-center text-sm font-bold text-text-main">{{ horesGp }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || totalGpAssignades >= totalGpDepartament"
          @click="$emit('incrementar-gp', professor)"
        >+</button>
      </div>
      <div v-if="totalPalicDepartament > 0" class="flex items-center gap-1.5">
        <span class="text-sm font-medium text-text-muted">PALIC</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesPalic === 0"
          @click="$emit('decrementar-palic', professor)"
        >−</button>
        <span class="w-4 text-center text-sm font-bold text-text-main">{{ horesPalic }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || totalPalicAssignades >= totalPalicDepartament"
          @click="$emit('incrementar-palic', professor)"
        >+</button>
      </div>
      <div v-if="mostraGc" class="flex items-center gap-1.5">
        <span class="text-sm font-medium text-text-muted">G. convivència</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGc === 0"
          @click="$emit('decrementar-gc', professor)"
        >−</button>
        <span class="w-4 text-center text-sm font-bold text-text-main">{{ horesGc }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGc >= 2"
          @click="$emit('incrementar-gc', professor)"
        >+</button>
      </div>
    </div>

    <!-- Seccions col·lapsables -->
    <div class="border-t border-border-soft bg-surface-soft">

      <!-- Comissions -->
      <div v-if="coordinacions.length > 0">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-hover"
          @click="mostrarComissions = !mostrarComissions"
        >
          <span>Comissions{{ coordinacionsProfessor.length ? ` (${coordinacionsProfessor.length})` : '' }}</span>
          <span class="text-text-muted">{{ mostrarComissions ? '▲' : '▼' }}</span>
        </button>
        <div v-if="mostrarComissions" class="px-3 pb-3">
          <div v-if="coordinacionsProfessor.length" class="mb-2 space-y-1">
            <div
              v-for="c in coordinacionsProfessor"
              :key="c.id"
              class="app-surface-row flex items-center justify-between gap-2 text-sm"
            >
              <span class="text-text-main">{{ c.materia }}
                <span class="text-text-muted">· {{ esCoordinador(c) ? 'coord.' : 'membre' }}</span>
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
              class="form-input w-full py-1 text-sm"
            >
              <option v-for="c in coordinacionsDisponibles" :key="c.id" :value="c.id">{{ c.materia }}</option>
            </select>
            <button
              type="button"
              class="mt-2 w-full rounded-md bg-success py-1.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-success-dark"
              :disabled="bloquejat || coordinacionsSeleccionades.length === 0"
              @click="afegirCoordinacions"
            >Afegeix seleccionades</button>
          </div>
        </div>
      </div>

      <!-- Preferències i comentaris -->
      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-hover"
        @click="mostrarPreferencies = !mostrarPreferencies"
      >
        <span>Preferències i comentaris</span>
        <span class="text-text-muted">{{ mostrarPreferencies ? '▲' : '▼' }}</span>
      </button>
      <div v-if="mostrarPreferencies" class="space-y-3 px-4 pb-4">
        <label class="block text-sm font-medium text-text-secondary">
          Horari preferit
          <select
            :value="professor.preferencia"
            @change="updatePreferencia($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full py-1.5 text-sm"
          >
            <option value="">Sense preferència</option>
            <option value="pronto">Entrar prest</option>
            <option value="tarde">Entrar tard</option>
          </select>
        </label>
        <label v-if="professor.preferencia" class="block text-sm font-medium text-text-secondary">
          Motiu al·legat
          <textarea
            :value="professor.motiuAllegat"
            @input="updateMotiuAllegat($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full text-sm"
            rows="2"
          />
        </label>
        <label class="block text-sm font-medium text-text-secondary">
          Comentaris
          <textarea
            :value="professor.comentaris"
            @input="updateComentaris($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full text-sm"
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
  horesGc: { type: Number, default: 0 },
  guardesPrevistes: { type: Number, default: null },
  mostraGp: { type: Boolean, default: true },
  mostraGc: { type: Boolean, default: false },
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
  'incrementar-gc',
  'decrementar-gc',
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
  if (isOverLimit.value) return 'app-chip app-chip-danger';
  if (isOverRecommended.value) return 'app-chip app-chip-warning';
  if (isPerfectHours.value) return 'app-chip app-chip-success';
  return 'app-chip';
});

const estatTextClass = computed(() => {
  if (isOverLimit.value) return 'text-red-600';
  if (isOverRecommended.value) return 'text-orange-600';
  if (isPerfectHours.value) return 'text-emerald-600';
  if (isEmpty.value) return 'text-text-muted';
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
