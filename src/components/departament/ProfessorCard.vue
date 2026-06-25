<template>
  <div
    class="app-card professor-card overflow-hidden transition-all duration-200"
    :data-validation-professor="professor.nom"
    tabindex="-1"
  >

    <!-- Capçalera: nom + hores -->
    <div class="app-card-header px-4 pb-2 pt-3">
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-lg font-medium leading-tight text-text-main">{{ professor.nom }}</h4>
        <span class="shrink-0 rounded-md px-2.5 py-1 text-lg font-semibold leading-none" :class="horesBadgeClass">
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
        <span class="text-[0.95rem] font-medium" :class="estatTextClass">{{ estatText }}</span>
        <span v-if="professor.jornada" class="app-chip px-1.5 py-0.5 text-xs font-normal">
          {{ textJornada(professor) }}
        </span>
        <span v-if="professor.preferencia" class="app-chip px-1.5 py-0.5 text-xs font-normal">
          {{ professor.preferencia === 'pronto' ? '↑ Prest' : '↓ Tard' }}
        </span>
        <span v-if="guardesPrevistes !== null" class="app-chip px-1.5 py-0.5 text-xs font-normal"
          :class="guardesPrevistes === 0 ? 'bg-slate-100 text-slate-400' : ''">
          {{ guardesPrevistes === 0 ? 'Exempt de guàrdies' : `${guardesPrevistes} guàrdies` }}
        </span>
      </div>
    </div>

    <!-- Matèries -->
    <div v-if="comentariFull" class="border-t border-border-soft bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <p class="text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">Comentari del full Professorat</p>
      <p class="mt-0.5 whitespace-pre-line font-medium">{{ comentariFull }}</p>
    </div>

    <div class="border-t border-border-soft px-3 py-2">
      <div v-if="classes.length === 0" class="py-1 text-center text-[0.95rem] italic text-text-muted">
        Sense matèries assignades
      </div>
      <div v-else class="space-y-0.5">
        <div
          v-for="classe in classes"
          :key="classe.id"
          class="flex items-center gap-1.5 rounded px-1 py-1 text-[0.95rem] hover:bg-surface-hover"
        >
          <span class="w-16 shrink-0 font-mono text-text-muted">{{ classe.curs }} {{ classe.grup }}</span>
          <span class="min-w-0 flex-1 truncate font-normal text-text-main">{{ classe.materia }}</span>
          <span v-if="classe.tipus" class="app-chip shrink-0 px-1.5 py-0 text-xs">{{ classe.tipus }}</span>
          <span v-if="rolClasse(classe)" class="shrink-0 text-xs italic text-text-muted">{{ rolClasse(classe) }}</span>
          <span class="w-8 shrink-0 text-right font-medium text-text-secondary">{{ horesComputablesClasse(classe) }}h</span>
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

    <!-- Extres horaris -->
    <div
      v-if="mostraGp || totalPalicDepartament > 0 || totalSdDepartament > 0 || totalDdDepartament > 0 || mostraGc"
      class="space-y-2 border-t border-border-soft bg-surface-soft px-4 py-3"
    >
      <div v-if="mostraGp" class="flex items-center justify-between gap-3">
        <span class="text-[0.95rem] font-normal text-text-secondary">Guàrdies de pati</span>
        <div class="flex items-center gap-2">
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGp === 0"
          @click="$emit('decrementar-gp', professor)"
        >−</button>
        <span class="w-6 text-center text-[0.95rem] font-medium text-text-main">{{ horesGp }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || totalGpAssignades >= totalGpDepartament"
          @click="$emit('incrementar-gp', professor)"
        >+</button>
        </div>
      </div>
      <div v-if="totalPalicDepartament > 0" class="flex items-center justify-between gap-3">
        <span class="text-[0.95rem] font-normal text-text-secondary">PALIC</span>
        <div class="flex items-center gap-2">
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesPalic === 0"
          @click="$emit('decrementar-palic', professor)"
        >−</button>
        <span class="w-6 text-center text-[0.95rem] font-medium text-text-main">{{ horesPalic }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || totalPalicAssignades >= totalPalicDepartament"
          @click="$emit('incrementar-palic', professor)"
        >+</button>
        </div>
      </div>
      <div v-if="totalSdDepartament > 0" class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[0.95rem] font-normal text-text-secondary">Suport divisible</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="app-mini-button"
              :disabled="bloquejat || horesSd === 0"
              @click="$emit('decrementar-sd', { professor, index: sdAssignacions.length - 1 })"
            >-</button>
            <span class="w-6 text-center text-[0.95rem] font-medium text-text-main">{{ horesSd }}</span>
            <button
              type="button"
              class="app-mini-button"
              :disabled="bloquejat || totalSdAssignades >= totalSdDepartament"
              @click="$emit('incrementar-sd', professor)"
            >+</button>
          </div>
        </div>
        <div v-if="sdAssignacions.length" class="space-y-1">
          <div
            v-for="(assignacio, index) in sdAssignacions"
            :key="assignacio.id || index"
            class="flex items-center gap-2"
          >
            <label class="w-20 shrink-0 text-xs text-text-muted">Hora {{ index + 1 }}</label>
            <input
              type="text"
              class="form-input min-w-0 flex-1 px-2 py-1 text-sm"
              :list="sdDatalistId"
              :value="assignacio.grup"
              placeholder="Grup de suport"
              :disabled="bloquejat"
              @change="$emit('actualitzar-sd-grup', { professor, index, grup: $event.target.value })"
            />
            <button
              type="button"
              class="rounded px-1 text-text-muted hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              :disabled="bloquejat"
              :aria-label="`Llevar hora ${index + 1} de suport divisible`"
              @click="$emit('decrementar-sd', { professor, index })"
            >x</button>
          </div>
          <datalist :id="sdDatalistId">
            <option v-for="grup in grupsSd" :key="grup" :value="grup" />
          </datalist>
        </div>
      </div>
      <div v-if="totalDdDepartament > 0" class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[0.95rem] font-normal text-text-secondary">Desdoblament divisible</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="app-mini-button"
              :disabled="bloquejat || horesDd === 0"
              @click="$emit('decrementar-dd', { professor, index: ddAssignacions.length - 1 })"
            >-</button>
            <span class="w-6 text-center text-[0.95rem] font-medium text-text-main">{{ horesDd }}</span>
            <button
              type="button"
              class="app-mini-button"
              :disabled="bloquejat || totalDdAssignades >= totalDdDepartament"
              @click="$emit('incrementar-dd', professor)"
            >+</button>
          </div>
        </div>
        <div v-if="ddAssignacions.length" class="space-y-1">
          <div
            v-for="(assignacio, index) in ddAssignacions"
            :key="assignacio.id || index"
            class="flex items-center gap-2"
          >
            <label class="w-20 shrink-0 text-xs text-text-muted">Hora {{ index + 1 }}</label>
            <input
              type="text"
              class="form-input min-w-0 flex-1 px-2 py-1 text-sm"
              :list="ddDatalistId"
              :value="assignacio.grup"
              placeholder="Grup de desdoblament"
              :disabled="bloquejat"
              @change="$emit('actualitzar-dd-grup', { professor, index, grup: $event.target.value })"
            />
            <button
              type="button"
              class="rounded px-1 text-text-muted hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              :disabled="bloquejat"
              :aria-label="`Llevar hora ${index + 1} de desdoblament divisible`"
              @click="$emit('decrementar-dd', { professor, index })"
            >x</button>
          </div>
          <datalist :id="ddDatalistId">
            <option v-for="grup in grupsDd" :key="grup" :value="grup" />
          </datalist>
        </div>
      </div>
      <div v-if="mostraGc" class="flex items-center justify-between gap-3">
        <span class="text-[0.95rem] font-normal text-text-secondary">Guàrdies de convivència</span>
        <div class="flex items-center gap-2">
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGc === 0"
          @click="$emit('decrementar-gc', professor)"
        >−</button>
        <span class="w-6 text-center text-[0.95rem] font-medium text-text-main">{{ horesGc }}</span>
        <button
          type="button"
          class="app-mini-button"
          :disabled="bloquejat || horesGc >= 2"
          @click="$emit('incrementar-gc', professor)"
        >+</button>
        </div>
      </div>
    </div>

    <!-- Seccions col·lapsables -->
    <div class="border-t border-border-soft bg-surface-soft">

      <!-- Comissions -->
      <div v-if="coordinacions.length > 0">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-2 text-[0.95rem] font-medium text-text-muted hover:bg-surface-hover"
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
              <span class="text-text-main">{{ esCoordinador(c) ? c.materia : etiquetaComissio(c.materia) }}
                <span class="text-text-muted">· {{ esCoordinador(c) ? 'coordinador/a' : 'membre' }}</span>
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
              <option v-for="c in coordinacionsDisponibles" :key="c.id" :value="c.id">{{ etiquetaComissio(c.materia) }}</option>
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
          class="flex w-full items-center justify-between px-4 py-2 text-[0.95rem] font-medium text-text-muted hover:bg-surface-hover"
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
  horesSd: { type: Number, default: 0 },
  sdAssignacions: { type: Array, default: () => [] },
  horesDd: { type: Number, default: 0 },
  ddAssignacions: { type: Array, default: () => [] },
  horesGc: { type: Number, default: 0 },
  guardesPrevistes: { type: Number, default: null },
  mostraGp: { type: Boolean, default: true },
  mostraGc: { type: Boolean, default: false },
  grupsSd: { type: Array, default: () => [] },
  grupsDd: { type: Array, default: () => [] },
  totalGpDepartament: { type: Number, default: 0 },
  totalGpAssignades: { type: Number, default: 0 },
  totalPalicDepartament: { type: Number, default: 0 },
  totalPalicAssignades: { type: Number, default: 0 },
  totalSdDepartament: { type: Number, default: 0 },
  totalSdAssignades: { type: Number, default: 0 },
  totalDdDepartament: { type: Number, default: 0 },
  totalDdAssignades: { type: Number, default: 0 },
  coordinacions: { type: Array, default: () => [] },
  bloquejat: { type: Boolean, default: false },
});

const emit = defineEmits([
  'actualitzar-professor',
  'incrementar-gp',
  'decrementar-gp',
  'incrementar-palic',
  'decrementar-palic',
  'incrementar-sd',
  'decrementar-sd',
  'actualitzar-sd-grup',
  'incrementar-dd',
  'decrementar-dd',
  'actualitzar-dd-grup',
  'incrementar-gc',
  'decrementar-gc',
  'toggle-coordinacio',
  'desassignar-classe',
]);

const mostrarComissions = ref(false);
const mostrarPreferencies = ref(false);
const coordinacionsSeleccionades = ref([]);
const bloquejat = computed(() => props.bloquejat);
const sdDatalistId = computed(() =>
  `sd-grups-${(props.professor.id || props.professor.nom || 'professor')
    .toString()
    .replace(/[^a-zA-Z0-9_-]/g, '-')}`
);
const ddDatalistId = computed(() =>
  `dd-grups-${(props.professor.id || props.professor.nom || 'professor')
    .toString()
    .replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

const totalHoresProfessor = computed(() => props.horesLectives + props.horesPalic + props.horesSd + props.horesDd);
const limits = computed(() => limitsHoresProfessor(props.professor));
const comentariFull = computed(() => (props.professor.comentariFull || '').toString().trim());

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

function etiquetaComissio(materia) {
  let text = (materia || '').trim();
  // Elimina prefix coord-* quan va seguit de "comissió" (redundant)
  text = text.replace(/(?:coordinaci[oó]n?|coord(?:inaci[oó]n?)?\.?|coor\.?)\s+(?=comissi[oó])/gi, '');
  // Substitueix les formes restants per "Comissió"
  text = text
    .replace(/coordinaci[oó]n?/gi, 'Comissió')
    .replace(/\bcoor(?:d(?:inaci[oó]n?)?)?\.?(?=\s|$)/gi, 'Comissió')
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
