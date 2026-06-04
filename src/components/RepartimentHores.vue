<template>
  <div class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-slate-950">
        Classes del departament
      </h3>
      <p class="text-sm text-slate-600">
        {{ classesSenseAssignar.length }} pendents · {{ classesAssignades.length }} assignades
      </p>
    </div>

    <div
      v-if="error"
      class="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
    >
      {{ error }}
      <button type="button" class="ml-3 font-semibold hover:underline" @click="error = null">x</button>
    </div>

    <!-- Pendents -->
    <div
      v-if="classesSenseAssignar.length > 0"
      class="overflow-hidden card shadow-danger-glow"
    >
      <div class="border-b border-slate-200 bg-danger/5 px-3 py-2">
        <h4 class="text-sm font-bold text-slate-950">
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
              <span
                v-if="formatGrup(classe)"
                class="shrink-0 font-mono font-semibold text-slate-700"
              >
                {{ formatGrup(classe) }}
              </span>
              <span class="min-w-[12rem] flex-1 whitespace-normal break-words font-medium text-slate-800">{{ classe.materia }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span
                v-if="classe.tipus"
                class="chip"
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
            :aria-label="`Assignar professor a ${formatClasseLabel(classe)}`"
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
              {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Assignades -->
    <div
      v-if="classesAssignades.length > 0"
      class="overflow-hidden card shadow-success-glow"
    >
      <div class="border-b border-slate-200 bg-success/5 px-3 py-2">
        <h4 class="text-sm font-bold text-slate-950">
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
              <span
                v-if="formatGrup(classe)"
                class="shrink-0 font-mono font-semibold text-slate-700"
              >
                {{ formatGrup(classe) }}
              </span>
              <span class="min-w-[12rem] flex-1 whitespace-normal break-words font-medium text-slate-800">{{ classe.materia }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span
                v-if="classe.tipus"
                class="chip"
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
              {{ professor.nom }} · {{ calcularHoresProfessor(professor.nom) }}h
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
              class="shrink-0 text-lg font-bold leading-none text-danger hover:text-danger-dark dark:text-danger"
              :aria-label="`Desassignar ${formatClasseLabel(classe)}`"
            >x</button>
          </div>
          <p
            v-for="avis in avisosHores(classe)"
            :key="avis.nom"
            class="mt-1 text-xs font-medium"
            :class="avis.tipus === 'limit' ? 'text-danger-dark' : 'text-danger'"
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
  writeBatch,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useCursStore } from '../stores/curs';
import { limitsHoresProfessor, professorsClasse, horesComputablesClasse } from '../utils/horesProfessor';
import { classeCompletamentAssignada, professorPrincipalClasse, professorSecundariClasse, normalitzarProfessorsAssignats } from '../utils/assignacions';
import { esGP, esOptativaCompartida, exclosaDelRepartiment, getTipusText } from '../utils/tipus';
import {
  esTutoriaPrincipal,
  trobarTutoriaAsterisc,
  trobarAssignaturesParelladesTutoria,
  esCapsEstudisClasse,
  trobarDedicacioPerCapEstudis,
} from '../utils/tutories';
import { trobarGermanesBloc, normalitzarGrup } from '../utils/grups';
import { classePertanyDepartament } from '../utils/departaments';

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

const professorsDepartamentOrdenats = computed(() =>
  sortProfessors(
    professors.value.filter(
      (professor) => professor.departament === props.departamentSeleccionat
    )
  )
);

const horesPorProfessorMap = computed(() => {
  const map = new Map();
  for (const c of classes.value) {
    if (esGP(c.tipus)) continue;
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

function netejarGrupBuit(valor) {
  const text = (valor || '').toString().trim();
  return /^sense grup( assignat)?$/i.test(text) ? '' : text;
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
  return horesPorProfessorMap.value.get(nomProfessor) || 0;
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

async function assignarProfessors(classe) {
  if (props.bloquejat) return;
  try {
    classe.professors = normalitzarProfessorsAssignats(classe);

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
    for (const germana of trobarGermanesBloc(classe, classes.value)) {
      if (!classesPerActualitzar.some((c) => c.id === germana.id)) {
        classesPerActualitzar.push(germana);
      }
    }
    if (esCapsEstudisClasse(classe)) {
      for (const dedicacio of trobarDedicacioPerCapEstudis(classe, classes.value)) {
        if (!classesPerActualitzar.some((c) => c.id === dedicacio.id)) {
          classesPerActualitzar.push(dedicacio);
        }
      }
    }

    const batch = writeBatch(db);
    for (const item of classesPerActualitzar) {
      batch.update(cursStore.docRef('classes', item.id), {
        professors: [...classe.professors],
        professorAssignat: classe.professors[0] || '',
        lastModified: serverTimestamp(),
      });
    }
    await batch.commit();
    emit('assignacionsActualitzades');
  } catch (err) {
    console.error('Error assignant professors:', err);
    error.value = 'Error al guardar. Torna-ho a intentar.';
  }
}

async function assignarProfessor(classe, nomProfessor, index = 0) {
  if (index === 0 && !esOptativaCompartidaClasse(classe)) {
    classe.professors = nomProfessor ? [nomProfessor] : [];
  } else {
    const profs = professorsClasse(classe);
    profs[index] = nomProfessor;
    classe.professors = profs;
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
