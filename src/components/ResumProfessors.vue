<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="cerca"
        type="text"
        placeholder="Cerca professor..."
        aria-label="Cerca professor"
        class="form-input min-w-0 flex-1"
      />
      <select v-model="departamentFiltre" aria-label="Filtra per departament" class="form-input">
        <option value="">Tots els departaments</option>
        <option v-for="d in departamentsOrdenats" :key="d" :value="d">{{ d }}</option>
      </select>
      <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input v-model="nomesAvisos" type="checkbox" class="rounded" />
        Només amb avisos
      </label>
      <button
        @click="exportarExcel"
        aria-label="Exportar a Excel"
        class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
      >
        &darr; Excel
      </button>
    </div>

    <div
      v-for="dept in departamentsMostrats"
      :key="dept"
      class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 class="font-semibold text-slate-900">{{ dept }}</h3>
        <span class="text-sm text-slate-500">
          {{ professorsMostrats(dept).length }} professors · {{ totalHoresDept(dept) }}h
        </span>
      </div>

      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-slate-100">
          <tr class="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
            <th scope="col" class="px-4 py-2">Professor</th>
            <th scope="col" class="px-4 py-2 text-center">Lectives</th>
            <th scope="col" class="px-4 py-2 text-center">GP</th>
            <th scope="col" class="px-4 py-2 text-center">PALIC</th>
            <th scope="col" class="px-4 py-2">Preferència</th>
            <th scope="col" class="px-4 py-2">Avisos</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="p in professorsMostrats(dept)"
            :key="p.id"
            class="align-top"
            :class="getAvisos(p).length ? 'bg-amber-50/40' : ''"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">
                {{ p.nom }}
                <span v-if="esMajor55(p.nom)" class="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">&gt;55</span>
                <span v-if="p.jornada" class="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{{ textJornada(p) }}</span>
              </div>
              <div v-if="getClassesProfessor(p.nom).length" class="mt-1 text-xs leading-5 text-slate-400">
                {{ sortClasses(getClassesProfessor(p.nom)).map(c => c.materia + (c.grup ? ' ' + c.grup : '')).join(' · ') }}
              </div>
              <div v-if="p.motiuAllegat || p.comentaris" class="mt-1 text-xs italic text-slate-400">
                {{ [p.motiuAllegat, p.comentaris].filter(Boolean).join(' - ') }}
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="horesBadgeClass(p)">
                {{ calcularHoresProfessor(p.nom) }}h
              </span>
            </td>
            <td class="px-4 py-3 text-center text-slate-500">{{ getHoresGP(p.nom) || '-' }}</td>
            <td class="px-4 py-3 text-center text-slate-500">{{ getHoresPALIC(p.nom) || '-' }}</td>
            <td class="px-4 py-3 text-slate-600">{{ getPreferenciaText(p.preferencia) || '-' }}</td>
            <td class="px-4 py-3">
              <ul v-if="getAvisos(p).length" class="space-y-0.5">
                <li v-for="avis in getAvisos(p)" :key="avis" class="text-xs font-medium text-amber-700">
                  {{ avis }}
                </li>
              </ul>
              <span v-else class="text-slate-300">-</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div
      v-if="departamentsMostrats.length === 0"
      class="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400"
    >
      Cap professor amb aquests filtres.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { limitsHoresProfessor, textJornada, professorsClasse, classeAssignadaA, horesComputablesClasse, esMajorDe55Classe } from '../utils/horesProfessor';
import { descarregarExcel } from '../utils/exportExcel';

const cursStore = useCursStore();
const classes = ref([]);
const professors = ref([]);
const isConnected = ref(true);
const cerca = ref('');
const departamentFiltre = ref('');
const nomesAvisos = ref(false);

let classesUnsubscribe = null;
let professorsUnsubscribe = null;

const departamentsOrdenats = computed(() =>
  [...new Set(professors.value.map((p) => p.departament).filter(Boolean))].sort()
);

const departamentsMostrats = computed(() =>
  departamentsOrdenats.value.filter((dept) => {
    if (departamentFiltre.value && dept !== departamentFiltre.value) return false;
    return professorsMostrats(dept).length > 0;
  })
);

function normalitzar(text) {
  return (text || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getProfessorsDepartament(dept) {
  return professors.value
    .filter((p) => p.departament === dept)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'ca'));
}

function professorsMostrats(dept) {
  const terme = normalitzar(cerca.value);
  return getProfessorsDepartament(dept).filter((p) => {
    if (nomesAvisos.value && getAvisos(p).length === 0) return false;
    if (terme && !normalitzar(p.nom).includes(terme)) return false;
    return true;
  });
}

function totalHoresDept(dept) {
  return getProfessorsDepartament(dept).reduce((sum, p) => sum + calcularHoresProfessor(p.nom), 0);
}

function getClassesProfessor(nom) {
  return classes.value.filter((c) => classeAssignadaA(c, nom));
}

function calcularHoresProfessor(nom) {
  return getClassesProfessor(nom)
    .filter((c) => c.tipus !== 'GP' && c.tipus !== 'PALIC')
    .reduce((sum, c) => sum + horesComputablesClasse(c), 0);
}

function getHoresGP(nom) {
  const professor = professors.value.find((p) => p.nom === nom);
  return Number(professor?.gpAssignades || 0);
}

function getHoresPALIC(nom) {
  const professor = professors.value.find((p) => p.nom === nom);
  if (professor?.palicAssignades) return Number(professor.palicAssignades);
  const c = classes.value.find((c) => classeAssignadaA(c, nom) && c.tipus === 'PALIC');
  return c ? Number(c.hores) : 0;
}

function esMajor55(nom) {
  const prof = professors.value.find((p) => p.nom === nom);
  return prof?.major55 === true ||
    getClassesProfessor(nom).some((c) => esMajorDe55Classe(c));
}

function getPreferenciaText(pref) {
  return { pronto: 'Entrar prest', tarde: 'Entrar tard' }[pref] || '';
}

function getAvisos(professor) {
  const lectives = calcularHoresProfessor(professor.nom);
  const limits = limitsHoresProfessor(professor);
  const classesProfessor = getClassesProfessor(professor.nom);
  const tutories = classesProfessor.filter(
    (c) => normalitzar(c.materia || '').includes('tutoria') && !(c.materia || '').startsWith('*')
  );
  const avisos = [];
  if (lectives > limits.maxim) avisos.push(`Supera el màxim (${lectives}/${limits.maxim}h)`);
  else if (lectives < limits.ideal && lectives > 0) avisos.push(`Per sota de l'ideal (${lectives}/${limits.ideal}h)`);
  if (classesProfessor.length === 0) avisos.push('Sense classes assignades');
  if (tutories.length > 1) avisos.push(`${tutories.length} tutories assignades`);
  if (professor.preferencia && !professor.motiuAllegat) avisos.push('Preferència sense motiu al·legat');
  return avisos;
}

function horesBadgeClass(professor) {
  const lectives = calcularHoresProfessor(professor.nom);
  const limits = limitsHoresProfessor(professor);
  if (lectives > limits.maxim) return 'bg-red-100 text-red-800';
  if (lectives > limits.ideal) return 'bg-amber-100 text-amber-800';
  if (lectives === limits.ideal) return 'bg-green-100 text-green-800';
  return 'bg-blue-100 text-blue-800';
}

function sortClasses(list) {
  return [...list].sort((a, b) => {
    if ((a.curs || '') !== (b.curs || '')) return (a.curs || '').localeCompare(b.curs || '');
    if ((a.materia || '') !== (b.materia || '')) return (a.materia || '').localeCompare(b.materia || '');
    return (a.grup || '').localeCompare(b.grup || '');
  });
}

function exportarExcel() {
  const data = new Date().toLocaleDateString('ca-ES');
  const cap = ['Departament', 'Professor', 'H. Lectives', 'GP', 'PALIC', 'Jornada', 'Preferència', 'Avisos'];
  const files = [];
  for (const dept of departamentsOrdenats.value) {
    for (const p of getProfessorsDepartament(dept)) {
      files.push([
        dept,
        p.nom,
        calcularHoresProfessor(p.nom),
        getHoresGP(p.nom) || 0,
        getHoresPALIC(p.nom) || 0,
        textJornada(p) || '',
        getPreferenciaText(p.preferencia) || '',
        getAvisos(p).join('; ') || '',
      ]);
    }
  }
  const capAssig = ['Departament', 'Professor', 'Matèria', 'Curs', 'Grup', 'Tipus', 'Hores'];
  const filesAssig = [];
  for (const dept of departamentsOrdenats.value) {
    for (const p of getProfessorsDepartament(dept)) {
      for (const c of sortClasses(getClassesProfessor(p.nom))) {
        filesAssig.push([dept, p.nom, c.materia, c.curs || '', c.grup || '', c.tipus || '', horesComputablesClasse(c)]);
      }
    }
  }
  descarregarExcel(
    [
      { nom: 'Professors', dades: [[`Professors - ${data}`], [], cap, ...files] },
      { nom: 'Assignacions', dades: [capAssig, ...filesAssig] },
    ],
    `professors_${new Date().toISOString().slice(0, 10)}`
  );
}

function setupListeners() {
  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snap) => { classes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() })); isConnected.value = true; },
    () => { isConnected.value = false; }
  );
  professorsUnsubscribe = onSnapshot(
    query(cursStore.col('professors')),
    (snap) => { professors.value = snap.docs.map((d) => ({ id: d.id, ...d.data() })); isConnected.value = true; },
    () => { isConnected.value = false; }
  );
}

watch(() => cursStore.cursActiuId, setupListeners, { immediate: true });
onUnmounted(() => {
  classesUnsubscribe?.();
  professorsUnsubscribe?.();
});
</script>
