<template>
  <div class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-text-main">
        Classes
      </h3>
      <p class="text-sm text-text-secondary">
        {{ classesSenseAssignar.length }} pendents · {{ classesAssignades.length }} assignades
      </p>
    </div>

    <div
      v-if="classesDepartament.length > 0"
      class="app-card p-3"
    >
      <label class="block text-xs font-bold uppercase tracking-wide text-text-muted">
        Cerca
        <input
          v-model="cerca"
          type="search"
          class="form-input mt-1.5 py-1.5 text-sm"
          placeholder="Matèria, grup, tipus..."
        />
      </label>
      <div class="mt-3 grid grid-cols-3 gap-2 text-center">
        <div class="app-stat-tile app-stat-tile-primary">
          <div class="text-sm font-bold">{{ classesFiltrades.length }}</div>
          <div class="text-[10px] font-semibold uppercase tracking-wide">Visibles</div>
        </div>
        <div class="app-stat-tile app-stat-tile-warning">
          <div class="text-sm font-bold">{{ classesSenseAssignarFiltrades.length }}</div>
          <div class="text-[10px] font-semibold uppercase tracking-wide">Pendents</div>
        </div>
        <div class="app-stat-tile app-stat-tile-success">
          <div class="text-sm font-bold">{{ classesAssignadesFiltrades.length }}</div>
          <div class="text-[10px] font-semibold uppercase tracking-wide">Fetes</div>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
    >
      {{ error }}
      <button type="button" class="ml-3 font-semibold hover:underline" @click="error = null">x</button>
    </div>

    <!-- Totes assignades -->
    <div
      v-if="classesDepartament.length > 0 && classesSenseAssignar.length === 0"
      class="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-300"
    >
      <span class="text-base leading-none">✓</span>
      <span>Tot assignat</span>
    </div>

    <div
      v-if="classesDepartament.length > 0 && classesFiltrades.length === 0"
      class="app-empty-state p-5"
    >
      Cap resultat.
    </div>

    <!-- Pendents -->
    <div
      v-if="classesSenseAssignarFiltrades.length > 0"
      class="app-card overflow-hidden shadow-danger-glow"
    >
      <div class="app-card-header-warning px-3 py-2">
        <h4 class="text-sm font-bold text-text-main">
          Pendents ({{ classesSenseAssignarFiltrades.length }}<span v-if="cercaNormalitzada">/{{ classesSenseAssignar.length }}</span>)
        </h4>
      </div>
      <div class="divide-y divide-slate-100">
        <div
          v-for="classe in classesSenseAssignarFiltrades"
          :key="classe.id"
          :data-validation-class-id="classe.id"
          tabindex="-1"
          class="px-3 py-2"
        >
          <div class="mb-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span v-if="formatGrup(classe)" class="font-mono text-sm font-semibold text-text-secondary">{{ formatGrup(classe) }}</span>
                <span class="ml-1.5 font-medium text-text-main">{{ classe.materia }}</span>
              </div>
              <span class="badge badge-gray shrink-0 font-semibold">{{ classe.hores }}h</span>
            </div>
            <div v-if="classe.tipus" class="mt-1">
              <span :class="getTipusBadgeClass(classe.tipus)">{{ getTipusLabel(classe.tipus) }}</span>
            </div>
            <div v-if="classe.subclasses?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="subclasse in classe.subclasses"
                :key="`${subclasse.curs}-${subclasse.grup}-${subclasse.materia}`"
                class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
              >
                {{ subclasse.curs }} {{ subclasse.grup }}
              </span>
            </div>
          </div>
          <select
            :value="professorPrincipalClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value)"
            :disabled="bloquejat"
            :aria-label="`Assignar professor a ${formatClasseLabel(classe)}`"
            class="form-input w-full py-1.5 text-sm"
          >
            <option value="">Tria professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
            >
              {{ opcioProfessorText(classe, professor.nom) }}
            </option>
          </select>
          <p v-if="classe.professors?.length" class="mt-1 text-xs font-medium text-text-muted">
            Ara: {{ classe.professors.join(', ') }}
          </p>
          <select
            v-if="esOptativaCompartidaClasse(classe)"
            :value="professorSecundariClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value, 1)"
            :disabled="bloquejat"
            :aria-label="`Segon professor per a ${formatClasseLabel(classe)}`"
            class="form-input mt-1.5 w-full py-1.5 text-sm"
          >
            <option value="">Segon professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
              :disabled="professor.nom === professorPrincipalClasse(classe)"
            >
              {{ opcioProfessorText(classe, professor.nom, 1) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Assignades -->
    <div
      v-if="classesAssignadesFiltrades.length > 0"
      class="app-card overflow-hidden shadow-success-glow"
    >
      <div class="app-card-header-success px-3 py-2">
        <h4 class="text-sm font-bold text-text-main">
          Fetes ({{ classesAssignadesFiltrades.length }}<span v-if="cercaNormalitzada">/{{ classesAssignades.length }}</span>)
        </h4>
      </div>
      <div class="divide-y divide-slate-100">
        <div
          v-for="classe in classesAssignadesFiltrades"
          :key="classe.id"
          :data-validation-class-id="classe.id"
          tabindex="-1"
          class="px-3 py-2"
        >
          <div class="mb-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span v-if="formatGrup(classe)" class="font-mono text-sm font-semibold text-text-secondary">{{ formatGrup(classe) }}</span>
                <span class="ml-1.5 font-medium text-text-main">{{ classe.materia }}</span>
              </div>
              <span class="badge badge-gray shrink-0 font-semibold">{{ classe.hores }}h</span>
            </div>
            <div v-if="classe.tipus" class="mt-1">
              <span :class="getTipusBadgeClass(classe.tipus)">{{ getTipusLabel(classe.tipus) }}</span>
            </div>
            <div v-if="classe.subclasses?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="subclasse in classe.subclasses"
                :key="`${subclasse.curs}-${subclasse.grup}-${subclasse.materia}`"
                class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
              >
                {{ subclasse.curs }} {{ subclasse.grup }}
              </span>
            </div>
          </div>
          <select
            v-if="esOptativaCompartidaClasse(classe)"
            :value="professorSecundariClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value, 1)"
            :disabled="bloquejat"
            :aria-label="`Segon professor per a ${formatClasseLabel(classe)}`"
            class="form-input mt-1.5 w-full py-1.5 text-sm"
          >
            <option value="">Segon professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
              :disabled="professor.nom === professorPrincipalClasse(classe)"
            >
              {{ opcioProfessorText(classe, professor.nom, 1) }}
            </option>
          </select>
          <div class="flex items-center gap-1">
            <select
              :value="professorPrincipalClasse(classe)"
              @change="assignarProfessor(classe, $event.target.value)"
              :disabled="bloquejat"
              :aria-label="`Professor de ${formatClasseLabel(classe)}`"
              class="form-input flex-1 py-1.5 text-sm"
            >
              <option value="">Sense professor</option>
              <option
                v-for="professor in professorsDepartamentOrdenats"
                :key="professor.nom"
                :value="professor.nom"
              >
                {{ opcioProfessorText(classe, professor.nom) }}
              </option>
            </select>
            <button
              type="button"
              @click="desassignarProfessors(classe)"
              :disabled="bloquejat"
              class="shrink-0 text-lg font-bold leading-none text-danger hover:text-danger-dark dark:text-danger"
              :aria-label="`Desassignar ${formatClasseLabel(classe)}`"
            >x</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="classesDepartament.length === 0"
      class="app-empty-state p-8"
    >
      Sense classes.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useCursStore } from '../stores/curs';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { limitsHoresProfessor, professorsClasse, horesComputablesClasse } from '../utils/horesProfessor';
import { classeCompletamentAssignada, professorPrincipalClasse, professorSecundariClasse } from '../utils/assignacions';
import { classeRequereixDosProfessors, exclosaDelRepartiment, getTipusLabel, getTipusBadgeClass } from '../utils/tipus';
import { classePertanyDepartament, professorPertanyDepartament } from '../utils/departaments';
import { comptarDDAssignacions, comptarSDAssignacions } from '../utils/suportDivisible';
import {
  crearActualitzacionsAssignacio,
  crearActualitzacionsCanviProfessor,
} from '../services/assignacioRules';

const emit = defineEmits(['assignacionsActualitzades']);

const props = defineProps({
  departamentSeleccionat: {
    type: String,
    default: '',
  },
  bloquejat: {
    type: Boolean,
    default: false,
  },
  focusClassId: {
    type: String,
    default: '',
  },
  classes: {
    type: Array,
    default: null,
  },
  professors: {
    type: Array,
    default: null,
  },
});
const bloquejat = computed(() => props.bloquejat);

const cursStore = useCursStore();
const usaClassesExternes = computed(() => Array.isArray(props.classes));
const usaProfessorsExterns = computed(() => Array.isArray(props.professors));
const { items: classesSnapshot } = useCursCollectionSnapshot({
  colName: 'classes',
  enabled: computed(() => !usaClassesExternes.value),
  mapDoc: (d) => {
    const data = d.data();
    return { id: d.id, ...data, professors: data.professors || [data.professorAssignat].filter(Boolean) };
  },
});
const { items: professorsSnapshot } = useCursCollectionSnapshot({
  colName: 'professors',
  enabled: computed(() => !usaProfessorsExterns.value),
});
const classes = computed(() => usaClassesExternes.value ? props.classes : classesSnapshot.value);
const professors = computed(() => usaProfessorsExterns.value ? props.professors : professorsSnapshot.value);
const error = ref(null);
const cerca = ref('');

const classesDepartament = computed(() => {
  if (!props.departamentSeleccionat) return [];
  return sortClasses(
    classes.value.filter((classe) =>
      classePertanyDepartament(classe, props.departamentSeleccionat)
    )
  );
});

const classesSenseAssignar = computed(() =>
  classesDepartament.value.filter(
    (classe) =>
      !classeCompletamentAssignada(classe) &&
      !exclosaDelRepartiment(classe.tipus)
  )
);

const classesAssignades = computed(() =>
  classesDepartament.value.filter(
    (classe) =>
      classeCompletamentAssignada(classe) &&
      !exclosaDelRepartiment(classe.tipus)
  )
);

const cercaNormalitzada = computed(() => normalitzarCerca(cerca.value));

const classesFiltrades = computed(() => {
  if (!cercaNormalitzada.value) return classesDepartament.value;
  return classesDepartament.value.filter((classe) =>
    normalitzarCerca(formatClasseCerca(classe)).includes(cercaNormalitzada.value)
  );
});

const classesSenseAssignarFiltrades = computed(() =>
  classesSenseAssignar.value.filter((classe) => classesFiltrades.value.includes(classe))
);

const classesAssignadesFiltrades = computed(() =>
  classesAssignades.value.filter((classe) => classesFiltrades.value.includes(classe))
);

const professorsDepartamentOrdenats = computed(() =>
  sortProfessors(
    professors.value.filter(
      (professor) => professorPertanyDepartament(professor, props.departamentSeleccionat)
    )
  )
);

watch(
  () => props.focusClassId,
  (id) => {
    if (!id) return;
    if (classesDepartament.value.some((classe) => classe.id === id)) {
      cerca.value = '';
    }
  }
);

const horesPorProfessorMap = computed(() => {
  const map = new Map();
  for (const c of classes.value) {
    if (exclosaDelRepartiment(c.tipus)) continue;
    const hores = horesComputablesClasse(c);
    for (const nom of professorsClasse(c)) {
      if (!nom) continue;
      map.set(nom, (map.get(nom) || 0) + hores);
    }
  }
  return map;
});

function sortClasses(llista) {
  return [...llista].sort((a, b) => {
    if (!a.curs && !b.curs) return a.materia.localeCompare(b.materia);
    if (!a.curs) return 1;
    if (!b.curs) return -1;
    if (a.curs !== b.curs) return a.curs.localeCompare(b.curs);
    if (a.grup !== b.grup) return (a.grup || '').localeCompare(b.grup || '');
    return a.materia.localeCompare(b.materia);
  });
}

function sortProfessors(llista) {
  return [...llista].sort((a, b) => a.nom.localeCompare(b.nom));
}

function formatGrup(classe) {
  const curs = netejarGrupBuit(classe.curs);
  const grup = netejarGrupBuit(classe.grup);
  return `${curs} ${grup}`.trim();
}

function formatClasseLabel(classe) {
  return [classe.materia, formatGrup(classe)].filter(Boolean).join(' ');
}

function formatClasseCerca(classe) {
  return [
    classe.curs,
    classe.grup,
    classe.materia,
    classe.departament,
    classe.tipus,
    getTipusLabel(classe.tipus),
    ...(classe.subclasses || []).flatMap((subclasse) => [
      subclasse.curs,
      subclasse.grup,
      subclasse.materia,
    ]),
    ...(classe.professors || []),
  ].filter(Boolean).join(' ');
}

function normalitzarCerca(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function netejarGrupBuit(valor) {
  const text = (valor || '').toString().trim();
  return /^sense grup( assignat)?$/i.test(text) ? '' : text;
}

function esOptativaCompartidaClasse(classe) {
  return classeRequereixDosProfessors(classe);
}

function calcularHoresProfessor(nomProfessor) {
  const professor = getProfessor(nomProfessor);
  return (horesPorProfessorMap.value.get(nomProfessor) || 0)
    + (Number(professor.palicAssignades) || 0)
    + comptarSDAssignacions(professor)
    + comptarDDAssignacions(professor);
}

function horesClasseAmbProfessors(classe, professorsAssignats) {
  const profs = professorsAssignats.filter(Boolean);
  if (esOptativaCompartidaClasse(classe) && profs.length > 1) {
    return (Number(classe.hores) || 0) / profs.length;
  }
  return Number(classe.hores) || 0;
}

function professorsAmbAssignacio(classe, nomProfessor, index = 0) {
  if (index === 0 && !esOptativaCompartidaClasse(classe)) {
    return nomProfessor ? [nomProfessor] : [];
  }
  const profs = professorsClasse(classe);
  profs[index] = nomProfessor;
  return profs.filter(Boolean);
}

function horesResultantsProfessor(classe, nomProfessor, index = 0) {
  const actuals = professorsClasse(classe);
  const noves = professorsAmbAssignacio(classe, nomProfessor, index);
  const totalActual = calcularHoresProfessor(nomProfessor);
  const horesActualsClasse = actuals.includes(nomProfessor)
    ? horesClasseAmbProfessors(classe, actuals)
    : 0;
  const horesNovesClasse = noves.includes(nomProfessor)
    ? horesClasseAmbProfessors(classe, noves)
    : 0;

  return totalActual - horesActualsClasse + horesNovesClasse;
}

function estatHoresProfessor(nomProfessor, hores) {
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  if (hores > limits.maxim) return `excedeix ${formatHores(limits.maxim)}h`;
  if (hores > limits.ideal) return `sobre ${formatHores(limits.ideal)}h`;
  if (hores === limits.ideal) return 'ideal';
  return `${formatHores(limits.ideal - hores)}h fins ideal`;
}

function formatHores(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function opcioProfessorText(classe, nomProfessor, index = 0) {
  const actual = calcularHoresProfessor(nomProfessor);
  const resultat = horesResultantsProfessor(classe, nomProfessor, index);
  const canvi = resultat === actual
    ? `${formatHores(actual)}h`
    : `${formatHores(actual)}h -> ${formatHores(resultat)}h`;
  return `${nomProfessor} · ${canvi} · ${estatHoresProfessor(nomProfessor, resultat)}`;
}

function getProfessor(nomProfessor) {
  return (
    professors.value.find((professor) => professor.nom === nomProfessor) || {}
  );
}

function isOverRecommended(nomProfessor) {
  const hores = calcularHoresProfessor(nomProfessor);
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  return hores > limits.ideal && hores <= limits.maxim;
}

function isOverLimit(nomProfessor) {
  const hores = calcularHoresProfessor(nomProfessor);
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  return hores > limits.maxim;
}

function avisosHores(classe) {
  return professorsClasse(classe)
    .filter(Boolean)
    .map((nom) => {
      if (isOverLimit(nom)) return { nom, tipus: 'limit' };
      if (isOverRecommended(nom)) return { nom, tipus: 'recommended' };
      return null;
    })
    .filter(Boolean);
}

async function guardarActualitzacionsAssignacio(actualitzacions) {
  if (props.bloquejat) return;
  try {
    const batch = writeBatch(db);
    for (const actualitzacio of actualitzacions) {
      batch.update(cursStore.docRef('classes', actualitzacio.classe.id), {
        professors: [...actualitzacio.professors],
        professorAssignat: actualitzacio.professorAssignat,
        lastModified: serverTimestamp(),
      });
    }
    await batch.commit();
    emit('assignacionsActualitzades');
  } catch (err) {
    console.error('Error assignant professors:', err);
    error.value = "No s'ha pogut guardar.";
  }
}

async function assignarProfessor(classe, nomProfessor, index = 0) {
  const indexAssignacio = indexAssignacioPerDepartament(classe, nomProfessor, index);
  const actualitzacions = crearActualitzacionsCanviProfessor({
    classe,
    classes: classes.value,
    nomProfessor,
    index: indexAssignacio,
  });
  const principal = actualitzacions.find((item) => item.classe.id === classe.id);
  if (principal) {
    classe.professors = [...principal.professors];
    classe.professorAssignat = principal.professorAssignat;
  }
  await guardarActualitzacionsAssignacio(actualitzacions);
}

function indexAssignacioPerDepartament(classe, nomProfessor, index = 0) {
  if (index !== 0 || !classeRequereixDosProfessors(classe)) return index;
  const actuals = professorsClasse(classe);
  if (!actuals.length) return 0;

  const departament = props.departamentSeleccionat;
  const professorNou = getProfessor(nomProfessor);
  if (!professorPertanyDepartament(professorNou, departament)) return 0;

  const indexMateixDepartament = actuals.findIndex((nomActual) =>
    professorPertanyDepartament(getProfessor(nomActual), departament)
  );
  if (indexMateixDepartament >= 0) return indexMateixDepartament;
  return Math.min(actuals.length, 1);
}

async function desassignarProfessors(classe) {
  if (props.bloquejat) return;
  const actualitzacions = crearActualitzacionsAssignacio({
    classe,
    classes: classes.value,
    professors: [],
  });
  classe.professors = [];
  classe.professorAssignat = '';
  await guardarActualitzacionsAssignacio(actualitzacions);
}

</script>
