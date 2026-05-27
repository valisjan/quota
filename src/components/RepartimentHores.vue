<template>
  <div class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-slate-950">
        Classes del departament
      </h3>
      <p class="text-sm text-slate-500">
        {{ classesSenseAssignar.length }} pendents · {{ classesAssignades.length }} assignades
      </p>
    </div>

    <!-- Pendents -->
    <div
      v-if="classesSenseAssignar.length > 0"
      class="overflow-hidden rounded-lg border border-slate-200 border-l-4 border-l-[#FF8040] bg-white"
    >
      <div class="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h4 class="text-sm font-semibold text-slate-900">
          Pendents d'assignar ({{ classesSenseAssignar.length }})
        </h4>
      </div>
      <div class="divide-y divide-slate-100">
        <div
          v-for="classe in classesSenseAssignar"
          :key="classe.id"
          class="px-3 py-2"
        >
          <div class="mb-2">
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1 text-base leading-snug">
            <span class="shrink-0 font-mono font-semibold text-slate-700">{{ formatGrup(classe) }}</span>
            <span class="min-w-[12rem] flex-1 whitespace-normal break-words font-medium text-slate-800">{{ classe.materia }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span
                v-if="classe.tipus"
                class="rounded-sm bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700"
              >
                {{ getTipusText(classe.tipus) }}
              </span>
              <span class="rounded-sm bg-slate-100 px-2 py-1 text-base font-semibold text-slate-800">
                {{ classe.hores }}h
              </span>
            </div>
          </div>
          <select
            :value="professorPrincipalClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value)"
            :disabled="bloquejat"
            :aria-label="`Assignar professor a ${classe.materia} ${formatGrup(classe)}`"
            class="form-input w-full py-1.5 text-sm"
          >
            <option value="">Assignar professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
              :disabled="esConflicteSuport(classe, professor.nom)"
            >
              {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h{{ esConflicteSuport(classe, professor.nom) ? ' (ja té el grup)' : '' }}
            </option>
          </select>
          <select
            v-if="esOptativaCompartidaClasse(classe)"
            :value="professorSecundariClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value, 1)"
            :disabled="bloquejat"
            :aria-label="`Segon professor per a ${classe.materia} ${formatGrup(classe)}`"
            class="form-input mt-1.5 w-full py-1.5 text-sm"
          >
            <option value="">Segon professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
              :disabled="professor.nom === professorPrincipalClasse(classe)"
            >
              {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Assignades -->
    <div
      v-if="classesAssignades.length > 0"
      class="overflow-hidden rounded-lg border border-slate-200 border-l-4 border-l-[#00BF33] bg-white"
    >
      <div class="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h4 class="text-sm font-semibold text-slate-900">
          Assignades ({{ classesAssignades.length }})
        </h4>
      </div>
      <div class="divide-y divide-slate-100">
        <div
          v-for="classe in classesAssignades"
          :key="classe.id"
          class="px-3 py-2"
        >
          <div class="mb-2">
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1 text-base leading-snug">
            <span class="shrink-0 font-mono font-semibold text-slate-700">{{ formatGrup(classe) }}</span>
            <span class="min-w-[12rem] flex-1 whitespace-normal break-words font-medium text-slate-800">{{ classe.materia }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span
                v-if="classe.tipus"
                class="rounded-sm bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700"
              >
                {{ getTipusText(classe.tipus) }}
              </span>
              <span class="rounded-sm bg-slate-100 px-2 py-1 text-base font-semibold text-slate-800">
                {{ classe.hores }}h
              </span>
            </div>
          </div>
          <select
            v-if="esOptativaCompartidaClasse(classe)"
            :value="professorSecundariClasse(classe)"
            @change="assignarProfessor(classe, $event.target.value, 1)"
            :disabled="bloquejat"
            :aria-label="`Segon professor per a ${classe.materia} ${formatGrup(classe)}`"
            class="form-input mt-1.5 w-full py-1.5 text-sm"
          >
            <option value="">Segon professor</option>
            <option
              v-for="professor in professorsDepartamentOrdenats"
              :key="professor.nom"
              :value="professor.nom"
              :disabled="professor.nom === professorPrincipalClasse(classe)"
            >
              {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h
            </option>
          </select>
          <div class="flex items-center gap-1">
            <select
              :value="professorPrincipalClasse(classe)"
              @change="assignarProfessor(classe, $event.target.value)"
              :disabled="bloquejat"
              :aria-label="`Professor de ${classe.materia} ${formatGrup(classe)}`"
              class="form-input flex-1 py-1.5 text-sm"
            >
              <option value="">Sense assignar</option>
              <option
                v-for="professor in professorsDepartamentOrdenats"
                :key="professor.nom"
                :value="professor.nom"
                :disabled="esConflicteSuport(classe, professor.nom)"
              >
                {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h{{ esConflicteSuport(classe, professor.nom) ? ' (ja té el grup)' : '' }}
              </option>
            </select>
            <button
              type="button"
              @click="desassignarProfessors(classe)"
              :disabled="bloquejat"
              class="shrink-0 text-lg font-bold leading-none text-[#FF8040] hover:text-[#CC5020] dark:text-[#FF9060]"
              :aria-label="`Desassignar ${classe.materia} ${formatGrup(classe)}`"
            >×</button>
          </div>
          <p
            v-for="avis in avisosHores(classe)"
            :key="avis.nom"
            class="mt-1 text-xs font-medium"
            :class="avis.tipus === 'limit' ? 'text-[#CC5020]' : 'text-[#FF8040]'"
          >
            {{ avis.nom }}: {{ avis.tipus === 'limit' ? 'supera les hores permeses' : 'supera les hores recomanades' }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="classesDepartament.length === 0"
      class="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      No hi ha classes per a aquest departament.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import {
  updateDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { limitsHoresProfessor, professorsClasse, horesComputablesClasse } from '../utils/horesProfessor';
import { classeCompletamentAssignada, professorPrincipalClasse, professorSecundariClasse } from '../utils/assignacions';
import { esOptativaCompartida, exclosaDelRepartiment } from '../utils/tipus';
import {
  esTutoriaPrincipal,
  teTutoriaPrincipalParellada,
  trobarTutoriaAsterisc,
  trobarAssignaturesParelladesTutoria,
} from '../utils/tutories';
import { normalitzarGrup } from '../utils/grups';

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
});
const bloquejat = computed(() => props.bloquejat);

const cursStore = useCursStore();
const classes = ref([]);
const professors = ref([]);
const error = ref(null);

let classesUnsubscribe = null;
let professorsUnsubscribe = null;

const classesDepartament = computed(() => {
  if (!props.departamentSeleccionat) return [];
  return sortClasses(
    classes.value.filter((classe) =>
      classe.departaments?.includes(props.departamentSeleccionat) &&
      !teTutoriaPrincipalParellada(classe, classes.value)
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

const professorsDepartamentOrdenats = computed(() =>
  sortProfessors(
    professors.value.filter(
      (professor) => professor.departament === props.departamentSeleccionat
    )
  )
);

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
  const text = `${classe.curs || ''} ${classe.grup || ''}`.trim();
  return text || 'Sense grup';
}

function getTipusText(tipus) {
  const normal = (tipus || '').toString().toUpperCase();
  if (normal.startsWith('T')) return 'Optativa compartida';
  if (normal.startsWith('O')) return 'Optativa';

  const tipusMap = {
    O: 'Optativa',
    D: 'Desdoblament',
    S: 'Suport',
    A: 'Autodesdoble',
    A1: 'Autodesdoble',
    A2: 'Autodesdoble',
    A3: 'Autodesdoble',
    F: 'Flexible',
    GP: 'Guàrdies de pati',
    PALIC: 'PALIC',
    C: 'Coordinació',
  };
  return tipusMap[tipus] || tipus;
}

function normalitzarProfessorsClasse(classe) {
  if (!Array.isArray(classe.professors)) {
    classe.professors = [classe.professorAssignat].filter(Boolean);
  }
  return classe.professors;
}

function esOptativaCompartidaClasse(classe) {
  return esOptativaCompartida(classe.tipus);
}

function esConflicteSuport(classe, nomProfessor) {
  if ((classe?.tipus || '').toString().toUpperCase().trim() !== 'S') return false;
  const curs = (classe?.curs || '').toString().trim().toUpperCase();
  const grup = (classe?.grup || '').toString().trim().toUpperCase();
  if (!curs || !grup) return false;
  return classes.value.some((c) => {
    if (c.id === classe.id) return false;
    if (!(c.professors || []).includes(nomProfessor)) return false;
    if ((c.curs || '').toString().trim().toUpperCase() !== curs) return false;
    const grups = normalitzarGrup(c.grup).split('+').map((g) => g.trim().toUpperCase()).filter(Boolean);
    return grups.includes(grup);
  });
}

function calcularHoresProfessor(nomProfessor) {
  if (!nomProfessor) return 0;

  return classes.value
    .filter(
      (classe) =>
        classe.professors?.includes(nomProfessor) && classe.tipus !== 'GP'
    )
    .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
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
  return normalitzarProfessorsClasse(classe)
    .filter(Boolean)
    .map((nom) => {
      if (isOverLimit(nom)) return { nom, tipus: 'limit' };
      if (isOverRecommended(nom)) return { nom, tipus: 'recommended' };
      return null;
    })
    .filter(Boolean);
}

async function assignarProfessors(classe) {
  if (props.bloquejat) return;
  try {
    classe.professors = [
      ...new Set(normalitzarProfessorsClasse(classe).filter(Boolean)),
    ];

    const classesPerActualitzar = [classe];
    const tutoriaAsterisc = trobarTutoriaAsterisc(classe, classes.value);
    if (esTutoriaPrincipal(classe) && tutoriaAsterisc) {
      tutoriaAsterisc.professors = [...classe.professors];
      classesPerActualitzar.push(tutoriaAsterisc);
    }
    if (esTutoriaPrincipal(classe)) {
      for (const assignatura of trobarAssignaturesParelladesTutoria(classe, classes.value)) {
        if (!classesPerActualitzar.some((c) => c.id === assignatura.id)) {
          classesPerActualitzar.push(assignatura);
        }
      }
    }
    await Promise.all(
      classesPerActualitzar.map((item) =>
        updateDoc(cursStore.docRef('classes', item.id), {
          professors: [...classe.professors],
          professorAssignat: classe.professors[0] || '',
          lastModified: serverTimestamp(),
        })
      )
    );
    emit('assignacionsActualitzades');
  } catch (err) {
    console.error('Error assignant professors:', err);
    error.value = 'Error assignant professors';
  }
}

async function assignarProfessor(classe, nomProfessor, index = 0) {
  const professorsClasse = normalitzarProfessorsClasse(classe);
  if (index === 0 && !esOptativaCompartidaClasse(classe)) {
    classe.professors = nomProfessor ? [nomProfessor] : [];
  } else {
    professorsClasse[index] = nomProfessor;
    classe.professors = professorsClasse;
  }
  await assignarProfessors(classe);
}

async function desassignarProfessors(classe) {
  if (props.bloquejat) return;
  classe.professors = [];
  await assignarProfessors(classe);
}

function setupRealtimeListeners() {
  cleanupListeners();
  if (!cursStore.cursActiuId) {
    classes.value = [];
    professors.value = [];
    return;
  }

  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snapshot) => {
      classes.value = snapshot.docs.map((docu) => {
        const data = docu.data();
        return {
          id: docu.id,
          ...data,
          professors: data.professors || [data.professorAssignat].filter(Boolean),
        };
      });
    },
    (err) => {
      console.error('Error en listener de classes:', err);
      error.value = 'Error carregant les classes';
    }
  );

  professorsUnsubscribe = onSnapshot(
    query(cursStore.col('professors')),
    (snapshot) => {
      professors.value = snapshot.docs.map((docu) => ({
        id: docu.id,
        ...docu.data(),
      }));
    },
    (err) => {
      console.error('Error en listener de professors:', err);
      error.value = 'Error carregant els professors';
    }
  );
}

function cleanupListeners() {
  classesUnsubscribe?.();
  classesUnsubscribe = null;
  professorsUnsubscribe?.();
  professorsUnsubscribe = null;
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(cleanupListeners);
</script>
