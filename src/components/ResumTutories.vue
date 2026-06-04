<template>
 <div class="space-y-6">
 <div class="flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div
 class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
 :class="
 isConnected
 ? 'bg-green-200 text-green-900'
 : 'bg-red-200 text-red-900'
 "
 >
 <div
 class="w-2 h-2 rounded-full"
 :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
 ></div>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">
 Última actualització: {{ lastUpdate }}
 </div>
 </div>

 <section
 class="overflow-hidden card"
 >
 <div
 class="border-b border-slate-300 bg-slate-200 px-6 py-4 flex items-center justify-between gap-4"
 >
 <div>
 <h3 class="text-lg font-semibold text-slate-950">
 Tutories
 </h3>
 <p class="text-sm text-slate-600 mt-1">
 {{ tutoriesOrdenades.length }} tutors
 </p>
 </div>

 <div class="flex items-center gap-2">
 <span class="text-sm text-slate-700">Ordena per</span>
 <select
 v-model="ordenacio"
 class="form-input text-sm py-2 bg-white "
 >
 <option value="curs">Curs</option>
 <option value="professor">Professor</option>
 </select>
 </div>
 </div>

 <div
 v-if="tutoriesOrdenades.length === 0"
 class="p-8 text-center text-slate-600 italic"
 >
 No hi ha tutories assignades.
 </div>

 <div v-else class="overflow-x-auto">
 <table class="w-full text-sm">
 <thead>
 <tr class="border-b border-slate-300 bg-slate-200">
 <th class="text-left px-6 py-3 font-bold text-slate-800">Curs</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Grup</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Tutor</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">Departament</th>
 <th class="text-left px-6 py-3 font-bold text-slate-800">*Tutoria</th>
 <th class="text-center px-6 py-3 font-bold text-slate-800">Hores</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-slate-200">
 <tr
 v-for="tutoria in tutoriesOrdenades"
 :key="tutoria.id"
 class="hover:bg-slate-100"
 >
 <td class="px-6 py-3 font-medium text-slate-950">
 {{ tutoria.curs || 'Sense curs' }}
 </td>
 <td class="px-6 py-3 text-slate-700">
 {{ tutoria.grup || 'Sense grup' }}
 </td>
 <td class="px-6 py-3">
 <span v-if="tutoria.professorAssignat" class="text-slate-800">
 {{ tutoria.professorAssignat }}
 </span>
 <span v-else class="text-red-800 font-medium">
 Sense tutor assignat
 </span>
 </td>
 <td class="px-6 py-3">
 <span v-if="textDepartamentsTutoria(tutoria)" class="text-slate-800">
 {{ textDepartamentsTutoria(tutoria) }}
 </span>
 <span v-else class="text-amber-800 font-medium">
 Sense departament
 </span>
 </td>
 <td class="px-6 py-3">
 <span
 v-if="tutoriaAsteriscAssignada(tutoria)"
 class="text-slate-800"
 >
 {{ tutoriaAsteriscAssignada(tutoria).professorAssignat }}
 </span>
 <span
 v-else-if="tutoriaAsterisc(tutoria)"
 class="text-red-800 font-medium"
 >
 Sense assignar
 </span>
 <span v-else class="text-slate-500 italic">
 No importada
 </span>
 </td>
 <td class="px-6 py-3 text-center font-semibold text-slate-950">
 {{ tutoria.hores }}h
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </section>
 </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { esTutoriaPrincipal, trobarTutoriaAsterisc } from '../utils/tutories';

const cursStore = useCursStore();

const classes = ref([]);
const ordenacio = ref('curs');
const isConnected = ref(true);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

let classesUnsubscribe = null;

function updateLastUpdate() {
 lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const tutories = computed(() => {
 return classes.value.filter(esTutoriaPrincipal);
});

const tutoriesOrdenades = computed(() => {
 return [...tutories.value].sort((a, b) => {
 if (ordenacio.value === 'professor') {
 const professor = (a.professorAssignat || '').localeCompare(
 b.professorAssignat || ''
 );
 if (professor !== 0) return professor;
 }

 const curs = (a.curs || '').localeCompare(b.curs || '');
 if (curs !== 0) return curs;
 const grup = (a.grup || '').localeCompare(b.grup || '');
 if (grup !== 0) return grup;
 return (a.professorAssignat || '').localeCompare(b.professorAssignat || '');
 });
});

function tutoriaAsterisc(tutoria) {
 return trobarTutoriaAsterisc(tutoria, classes.value);
}

function tutoriaAsteriscAssignada(tutoria) {
 const asterisc = tutoriaAsterisc(tutoria);
 if (!asterisc?.professorAssignat) return null;
 return asterisc;
}

function departamentsClasse(classe) {
 return [
 ...new Set([
 ...(Array.isArray(classe?.departaments) ? classe.departaments : []),
 classe?.departament,
 ]
 .map((departament) => (departament || '').toString().trim())
 .filter(Boolean)),
 ];
}

function textDepartamentsTutoria(tutoria) {
 const asterisc = tutoriaAsterisc(tutoria);
 return [
 ...new Set([
 ...departamentsClasse(tutoria),
 ...departamentsClasse(asterisc),
 ]),
 ].join(', ');
}

function setupRealtimeListeners() {
 cleanupListeners();
 classesUnsubscribe = onSnapshot(
 query(cursStore.col('classes')),
 (snapshot) => {
 classes.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
 updateLastUpdate();
 isConnected.value = true;
 },
 () => {
 isConnected.value = false;
 }
 );
}

function cleanupListeners() {
 classesUnsubscribe?.();
 classesUnsubscribe = null;
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(cleanupListeners);
</script>
