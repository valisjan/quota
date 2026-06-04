<template>
 <div class="space-y-4">
 <div class="flex items-center justify-between">
 <div>
 <h3 class="text-lg font-semibold text-slate-950">
 Professorat &gt;55
 </h3>
 <p class="text-sm text-slate-600">
 {{ professorsMajors55.length }} professors
 </p>
 </div>
 <div
 class="flex items-center gap-2 rounded-full px-3 py-1 text-sm"
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'"
 >
 <span class="h-2 w-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>

 <div class="overflow-hidden card">
 <div v-if="professorsMajors55.length === 0" class="p-8 text-center text-slate-600">
 No hi ha professorat marcat com &gt;55.
 </div>

 <table v-else class="w-full text-sm">
 <thead class="bg-slate-100 ">
 <tr>
 <th class="px-4 py-3 text-left font-bold text-slate-800">Professor</th>
 <th class="px-4 py-3 text-left font-bold text-slate-800">Departament</th>
 <th class="px-4 py-3 text-center font-bold text-slate-800">Lectives</th>
 <th class="px-4 py-3 text-center font-bold text-slate-800">GP</th>
 <th class="px-4 py-3 text-center font-bold text-slate-800">PALIC</th>
 <th class="px-4 py-3 text-left font-bold text-slate-800">Preferència</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="professor in professorsMajors55"
 :key="professor.id"
 class="hover:bg-slate-100"
 >
 <td class="px-4 py-3 font-medium text-slate-950">{{ professor.nom }}</td>
 <td class="px-4 py-3 text-slate-700">{{ professor.departament }}</td>
 <td class="px-4 py-3 text-center font-semibold text-slate-950">
 {{ calcularHoresProfessor(professor.nom) }}h
 </td>
 <td class="px-4 py-3 text-center text-slate-700">
 {{ professor.gpAssignades || 0 }}
 </td>
 <td class="px-4 py-3 text-center text-slate-700">
 {{ professor.palicAssignades || 0 }}
 </td>
 <td class="px-4 py-3 text-slate-700">
 {{ getPreferenciaText(professor.preferencia) }}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { classeAssignadaA, horesComputablesClasse, esMajorDe55Classe } from '../utils/horesProfessor';
import { exclosaDelRepartiment } from '../utils/tipus';

const cursStore = useCursStore();

const classes = ref([]);
const professors = ref([]);
const isConnected = ref(true);

let classesUnsubscribe = null;
let professorsUnsubscribe = null;

const professorsMajors55 = computed(() =>
 professors.value
 .filter(esMajor55)
 .sort(
 (a, b) =>
 (a.departament || '').localeCompare(b.departament || '') ||
 (a.nom || '').localeCompare(b.nom || '')
 )
);

function esMajor55(professor) {
 return professor.major55 === true ||
 classes.value.some((c) => classeAssignadaA(c, professor.nom) && esMajorDe55Classe(c));
}

function calcularHoresProfessor(nomProfessor) {
 return classes.value
 .filter(
 (classe) =>
 classeAssignadaA(classe, nomProfessor) &&
 !exclosaDelRepartiment(classe.tipus)
 )
 .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
}

function getPreferenciaText(preferencia) {
 const labels = {
 pronto: 'Entrar prest',
 tarde: 'Entrar tard',
 };
 return labels[preferencia] || '';
}

function setupRealtimeListeners() {
 classesUnsubscribe?.();
 professorsUnsubscribe?.();
 classesUnsubscribe = onSnapshot(
 query(cursStore.col('classes')),
 (snapshot) => {
 classes.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );

 professorsUnsubscribe = onSnapshot(
 query(cursStore.col('professors')),
 (snapshot) => {
 professors.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(() => {
 classesUnsubscribe?.();
 professorsUnsubscribe?.();
});
</script>
