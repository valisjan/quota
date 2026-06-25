<template>
 <div class="space-y-4">
 <div class="print-hide flex flex-wrap items-center gap-3">
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
 class="overflow-hidden card"
 >
 <div class="flex items-center justify-between border-b border-slate-300 bg-slate-200 px-4 py-3">
 <h3 class="font-bold text-slate-950">{{ dept }}</h3>
 <span class="text-sm text-slate-600">
 {{ professorsMostrats(dept).length }} professors · {{ totalHoresDept(dept) }}h
 </span>
 </div>

 <div class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead class="border-b border-slate-300 bg-slate-200">
 <tr class="text-left text-xs font-bold uppercase tracking-wide text-slate-800">
 <th scope="col" class="px-4 py-2">Professor</th>
 <th scope="col" class="px-4 py-2 text-center">Total hores</th>
 <th scope="col" class="px-4 py-2 text-center">GP</th>
 <th scope="col" class="px-4 py-2 text-center">PALIC</th>
 <th scope="col" class="px-4 py-2 text-center">Suport divisible</th>
 <th scope="col" class="px-4 py-2 text-center">Desdoblament divisible</th>
 <th scope="col" class="px-4 py-2">Preferència</th>
 <th scope="col" class="px-4 py-2">Avisos</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="p in professorsMostrats(dept)"
 :key="p.id"
 class="align-top"
 :class="getAvisos(p).length ? 'bg-amber-100' : ''"
 >
 <td class="px-4 py-3">
 <div class="font-medium text-slate-900">
 {{ p.nom }}
 <span v-if="esMajor55(p.nom)" class="ml-1.5 rounded-full bg-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-900">&gt;55</span>
 <span v-if="p.jornada" class="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800">{{ textJornada(p) }}</span>
 </div>
 <div v-if="getClassesProfessor(p.nom).length" class="mt-1 text-xs leading-5 text-slate-500">
 {{ sortClasses(getClassesProfessor(p.nom)).map(c => c.materia + (c.grup ? ' ' + c.grup : '')).join(' · ') }}
 </div>
 <div v-if="p.motiuAllegat || p.comentaris" class="mt-1 text-xs italic text-slate-500">
 {{ [p.motiuAllegat, p.comentaris].filter(Boolean).join(' - ') }}
 </div>
 </td>
 <td class="px-4 py-3 text-center">
 <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="horesBadgeClass(p)">
 {{ calcularHoresTotalsProfessor(p.nom) }}h
 </span>
 </td>
 <td class="px-4 py-3 text-center text-slate-600">{{ getHoresGP(p.nom) || '-' }}</td>
 <td class="px-4 py-3 text-center text-slate-600">{{ getHoresPALIC(p.nom) || '-' }}</td>
 <td class="px-4 py-3 text-center text-slate-600">{{ getHoresSD(p.nom) || '-' }}</td>
 <td class="px-4 py-3 text-center text-slate-600">{{ getHoresDD(p.nom) || '-' }}</td>
 <td class="px-4 py-3 text-slate-700">{{ getPreferenciaText(p.preferencia) || '-' }}</td>
 <td class="px-4 py-3">
 <ul v-if="getAvisos(p).length" class="space-y-0.5">
 <li v-for="avis in getAvisos(p)" :key="avis" class="text-xs font-medium text-amber-900">
 {{ avis }}
 </li>
 </ul>
 <span v-else class="text-slate-500">—</span>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 <div
 v-if="departamentsMostrats.length === 0"
 class="card p-8 text-center text-slate-500"
 >
 Cap professor amb aquests filtres.
 </div>
 </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { limitsHoresProfessor, textJornada, professorsClasse, classeAssignadaA, horesComputablesClasse, esMajorDe55Classe } from '../utils/horesProfessor';
import { descarregarExcel } from '../utils/exportExcel';
import { comptarDDAssignacions, comptarSDAssignacions, normalitzarDDAssignacions, normalitzarSDAssignacions } from '../utils/suportDivisible';
import { departamentsProfessor, professorPertanyDepartament } from '../utils/departaments';

const { items: classes, isConnected: classesOk } = useCursCollectionSnapshot({ colName: 'classes' });
const { items: professors, isConnected: profsOk } = useCursCollectionSnapshot({ colName: 'professors' });
const isConnected = computed(() => classesOk.value && profsOk.value);
const cerca = ref('');
const departamentFiltre = ref('');
const nomesAvisos = ref(false);

const departamentsOrdenats = computed(() =>
 [...new Set(professors.value.flatMap((p) => departamentsProfessor(p)).filter(Boolean))].sort()
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
 .filter((p) => professorPertanyDepartament(p, dept))
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
 return getProfessorsDepartament(dept).reduce((sum, p) => sum + calcularHoresTotalsProfessor(p.nom), 0);
}

function getClassesProfessor(nom) {
 return classes.value.filter((c) => classeAssignadaA(c, nom));
}

function calcularHoresProfessor(nom) {
 return getClassesProfessor(nom)
 .filter((c) => !['GP', 'PALIC', 'SD', 'DD'].includes((c.tipus || '').toString().toUpperCase().trim()))
 .reduce((sum, c) => sum + horesComputablesClasse(c), 0);
}

function calcularHoresTotalsProfessor(nom) {
 return calcularHoresProfessor(nom) + getHoresPALIC(nom) + getHoresSD(nom) + getHoresDD(nom);
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

function getHoresSD(nom) {
 const professor = professors.value.find((p) => p.nom === nom);
 return professor ? comptarSDAssignacions(professor) : 0;
}

function getGrupsSD(nom) {
 const professor = professors.value.find((p) => p.nom === nom);
 return normalitzarSDAssignacions(professor?.sdAssignacions, professor?.sdAssignades)
 .map((assignacio, index) => assignacio.grup || `hora ${index + 1} sense grup`)
 .join(', ');
}

function getHoresDD(nom) {
 const professor = professors.value.find((p) => p.nom === nom);
 return professor ? comptarDDAssignacions(professor) : 0;
}

function getGrupsDD(nom) {
 const professor = professors.value.find((p) => p.nom === nom);
 return normalitzarDDAssignacions(professor?.ddAssignacions, professor?.ddAssignades)
 .map((assignacio, index) => assignacio.grup || `hora ${index + 1} sense grup`)
 .join(', ');
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
 const lectives = calcularHoresTotalsProfessor(professor.nom);
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
 const lectives = calcularHoresTotalsProfessor(professor.nom);
 const limits = limitsHoresProfessor(professor);
 if (lectives > limits.maxim) return 'bg-red-200 text-red-900';
 if (lectives > limits.ideal) return 'bg-amber-200 text-amber-900';
 if (lectives === limits.ideal) return 'bg-green-200 text-green-900';
 return 'bg-blue-200 text-blue-900';
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
 const cap = ['Departament', 'Professor', 'Total hores', 'GP', 'PALIC', 'Suport divisible', 'Grups SD', 'Desdoblament divisible', 'Grups DD', 'Jornada', 'Preferència', 'Avisos'];
 const files = [];
 for (const dept of departamentsOrdenats.value) {
 for (const p of getProfessorsDepartament(dept)) {
 files.push([
 dept,
 p.nom,
 calcularHoresTotalsProfessor(p.nom),
 getHoresGP(p.nom) || 0,
 getHoresPALIC(p.nom) || 0,
 getHoresSD(p.nom) || 0,
 getGrupsSD(p.nom),
 getHoresDD(p.nom) || 0,
 getGrupsDD(p.nom),
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
 for (const sd of normalitzarSDAssignacions(p.sdAssignacions, p.sdAssignades)) {
 filesAssig.push([dept, p.nom, 'Suport divisible', '', sd.grup || '', 'SD', 1]);
 }
 for (const dd of normalitzarDDAssignacions(p.ddAssignacions, p.ddAssignades)) {
 filesAssig.push([dept, p.nom, 'Desdoblament divisible', '', dd.grup || '', 'DD', 1]);
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

</script>
