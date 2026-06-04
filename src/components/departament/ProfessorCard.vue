<template>
  <div
    class="overflow-hidden rounded-lg border transition-all duration-200"
    :class="cardClass"
  >
    <div class="px-4 pb-3 pt-4" :class="headerClass">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h4 class="text-lg font-semibold tracking-tight text-slate-950">
            {{ professor.nom }}
          </h4>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="horesBadgeClass">
              {{ totalHoresProfessor }} / {{ limits.ideal }}h
            </span>
            <span
              v-if="professor.jornada"
              class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
            >
              {{ textJornada(professor) }}
            </span>
            <span
              v-if="professor.preferencia"
              class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
            >
              {{ professor.preferencia === 'pronto' ? 'Entrar prest' : 'Entrar tard' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-4" :class="bodyClass">
      <div class="grid gap-2 text-center" :class="resumGridClass">
        <div class="rounded-md bg-slate-100 px-3 py-2">
          <div class="text-xs font-medium text-slate-600">Lectives</div>
          <div class="text-xl font-bold text-slate-950">{{ horesLectives }}</div>
        </div>

        <div v-if="mostraGp" class="rounded-md bg-slate-100 px-3 py-2">
          <div class="text-xs font-medium text-slate-600">GP</div>
          <div class="mt-1 flex items-center justify-center gap-1.5">
            <button
              type="button"
              class="h-7 w-7 rounded-sm border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40"
              :disabled="bloquejat || horesGp === 0"
              :aria-label="`Reduir GP de ${professor.nom}`"
              @click="$emit('decrementar-gp', professor)"
            >
              -
            </button>
            <span class="w-6 font-bold text-slate-950" aria-live="polite">{{ horesGp }}</span>
            <button
              type="button"
              class="h-7 w-7 rounded-sm border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40"
              :disabled="bloquejat || totalGpAssignades >= totalGpDepartament"
              :aria-label="`Augmentar GP de ${professor.nom}`"
              @click="$emit('incrementar-gp', professor)"
            >
              +
            </button>
          </div>
        </div>

        <div v-if="totalPalicDepartament > 0" class="rounded-md bg-slate-100 px-3 py-2">
          <div class="text-xs font-medium text-slate-600">PALIC</div>
          <div class="mt-1 flex items-center justify-center gap-1.5">
            <button
              type="button"
              class="h-7 w-7 rounded-sm border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40"
              :disabled="bloquejat || horesPalic === 0"
              :aria-label="`Reduir PALIC de ${professor.nom}`"
              @click="$emit('decrementar-palic', professor)"
            >
              -
            </button>
            <span class="w-6 font-bold text-slate-950" aria-live="polite">{{ horesPalic }}</span>
            <button
              type="button"
              class="h-7 w-7 rounded-sm border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40"
              :disabled="bloquejat || totalPalicAssignades >= totalPalicDepartament"
              :aria-label="`Augmentar PALIC de ${professor.nom}`"
              @click="$emit('incrementar-palic', professor)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div>
        <h5 class="mb-2 text-sm font-semibold text-slate-700">
          Matèries assignades
        </h5>
        <div v-if="classes.length === 0" class="rounded bg-slate-50 p-3 text-sm italic text-slate-600">
          Sense matèries assignades
        </div>
        <div v-else class="divide-y divide-slate-100 rounded border border-slate-200">
          <div
            v-for="classe in classes"
            :key="classe.id"
            class="flex items-center gap-2 px-2.5 py-1.5 text-sm"
          >
            <span class="shrink-0 font-mono text-slate-500">{{ classe.curs }} {{ classe.grup }}</span>
            <span class="min-w-0 flex-1 truncate font-medium text-slate-800">{{ classe.materia }}</span>
            <span v-if="classe.tipus" class="shrink-0 rounded-sm bg-slate-100 px-1 font-medium text-slate-700">{{ classe.tipus }}</span>
            <span
              v-if="rolClasse(classe)"
              class="shrink-0 rounded-sm bg-slate-100 px-1.5 font-medium text-slate-700"
            >
              {{ rolClasse(classe) }}
            </span>
            <span class="shrink-0 font-mono font-semibold text-slate-700">{{ horesComputablesClasse(classe) }}h</span>
            <button
              type="button"
              class="shrink-0 text-slate-500 hover:text-slate-950"
              :aria-label="`Desassignar ${classe.materia} de ${professor.nom}`"
              :disabled="bloquejat"
              @click="$emit('desassignar-classe', { professor, classe })"
            >x</button>
          </div>
        </div>
      </div>

      <div
        v-if="coordinacions.length > 0"
        class="rounded-md border border-slate-200 bg-slate-50 p-3"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <h5 class="text-sm font-semibold text-slate-800">
            Comissions
          </h5>
          <button
            type="button"
            class="rounded-md bg-success px-3 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-40 hover:bg-success-dark"
            :disabled="bloquejat || coordinacionsSeleccionades.length === 0"
            @click="afegirCoordinacions"
          >
            Afegeix
          </button>
        </div>

        <select
          v-model="coordinacionsSeleccionades"
          multiple
          size="4"
          :disabled="bloquejat"
          :aria-label="`Selecciona comissions per afegir a ${professor.nom}`"
          class="form-input w-full bg-white py-2 text-sm"
        >
          <option
            v-for="coordinacio in coordinacionsDisponibles"
            :key="coordinacio.id"
            :value="coordinacio.id"
          >
            {{ coordinacio.materia }}
          </option>
        </select>

        <div v-if="coordinacionsProfessor.length > 0" class="mt-3 space-y-1.5">
          <div
            v-for="coordinacio in coordinacionsProfessor"
            :key="coordinacio.id"
            class="flex items-center justify-between gap-3 rounded bg-white px-2 py-1.5 text-sm"
          >
            <span class="text-slate-900">
              {{ coordinacio.materia }}
              <span class="text-xs text-slate-600">
                {{ esCoordinador(coordinacio) ? 'coordinador' : 'membre' }}
              </span>
            </span>
            <button
              v-if="!esCoordinador(coordinacio)"
              type="button"
              class="text-sm text-slate-700 hover:text-slate-950 hover:underline"
              :disabled="bloquejat"
              @click="
                $emit('toggle-coordinacio', {
                  professor,
                  coordinacio,
                  participa: false,
                })
              "
            >
              Elimina
            </button>
          </div>
        </div>
      </div>

      <div
        class="rounded-md border p-3"
        :class="professor.preferencia
          ? 'border-slate-300 bg-slate-50'
          : 'border-slate-200 bg-slate-50'"
      >
        <h5 class="mb-3 text-sm font-semibold"
          :class="professor.preferencia ? 'text-slate-900' : 'text-slate-700'"
        >
          Preferència horària
        </h5>
        <label class="block text-sm font-medium text-slate-700">
          Horari preferit
          <select
            :value="professor.preferencia"
            @change="updatePreferencia($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full bg-white py-2 text-sm"
          >
            <option value="">Sense preferència</option>
            <option value="pronto">Entrar prest</option>
            <option value="tarde">Entrar tard</option>
          </select>
        </label>
        <label
          v-if="professor.preferencia"
          class="mt-3 block text-sm font-medium text-slate-700"
        >
          Motiu al·legat
          <textarea
            :value="professor.motiuAllegat"
            @input="updateMotiuAllegat($event.target.value)"
            :disabled="bloquejat"
            class="form-input mt-1 w-full bg-white text-sm"
            rows="2"
          ></textarea>
        </label>
      </div>

      <label class="block text-sm font-medium text-slate-700">
        Comentaris
        <textarea
          :value="professor.comentaris"
          @input="updateComentaris($event.target.value)"
          :disabled="bloquejat"
          class="form-input mt-1 w-full bg-white text-sm"
          rows="2"
        ></textarea>
      </label>
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

const coordinacionsSeleccionades = ref([]);
const bloquejat = computed(() => props.bloquejat);

const resumGridClass = computed(() => {
  const columnes = 1 + (props.mostraGp ? 1 : 0) + (props.totalPalicDepartament > 0 ? 1 : 0);
  return {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  }[columnes];
});

const totalHoresProfessor = computed(
  () => props.horesLectives + props.horesPalic
);

const limits = computed(() => limitsHoresProfessor(props.professor));

const isPerfectHours = computed(
  () => totalHoresProfessor.value === limits.value.ideal
);
const isOverRecommended = computed(
  () =>
    totalHoresProfessor.value > limits.value.ideal &&
    totalHoresProfessor.value <= limits.value.maxim
);
const isOverLimit = computed(
  () => totalHoresProfessor.value > limits.value.maxim
);
const isOver18 = computed(() => totalHoresProfessor.value > 18);

const cardClass = computed(() => {
  if (isOverLimit.value || isOver18.value) return 'shadow-danger-dark-glow border-amber-200 bg-amber-50/70';
  if (isOverRecommended.value) return 'shadow-danger-glow border-amber-200 bg-amber-50/50';
  if (isPerfectHours.value) return 'shadow-success-glow border-emerald-200 bg-emerald-50/70';
  return 'shadow-primary-glow border-slate-200 bg-white';
});

const headerClass = computed(() => {
  if (isOverLimit.value || isOver18.value) return 'bg-amber-50/80 border-b border-amber-100';
  if (isOverRecommended.value) return 'bg-amber-50/60 border-b border-amber-100';
  if (isPerfectHours.value) return 'bg-emerald-50/80 border-b border-emerald-100';
  return 'bg-white border-b border-slate-100';
});

const bodyClass = computed(() => {
  if (isOverLimit.value || isOver18.value) return 'bg-amber-50/35';
  if (isOverRecommended.value) return 'bg-amber-50/25';
  if (isPerfectHours.value) return 'bg-emerald-50/35';
  return 'bg-white';
});

const horesBadgeClass = computed(() => 'bg-slate-100 text-slate-800');

const coordinacionsProfessor = computed(() => {
  return props.coordinacions.filter(
    (coordinacio) =>
      esCoordinador(coordinacio) || participaEnCoordinacio(coordinacio)
  );
});

const coordinacionsDisponibles = computed(() => {
  return props.coordinacions.filter(
    (coordinacio) =>
      !esCoordinador(coordinacio) && !participaEnCoordinacio(coordinacio)
  );
});

function participaEnCoordinacio(coordinacio) {
  return (coordinacio.participants || []).includes(props.professor.nom);
}

function esCoordinador(coordinacio) {
  return coordinacio.professorAssignat === props.professor.nom;
}

function rolClasse(classe) {
  if (classe.professorAssignat === props.professor.nom) return 'principal';
  if ((classe.professors || []).includes(props.professor.nom)) return 'codocent';
  return '';
}

function afegirCoordinacions() {
  if (props.bloquejat) return;
  const seleccionades = props.coordinacions.filter((item) =>
    coordinacionsSeleccionades.value.includes(item.id)
  );

  seleccionades.forEach((coordinacio) => {
    emit('toggle-coordinacio', {
      professor: props.professor,
      coordinacio,
      participa: true,
    });
  });

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
