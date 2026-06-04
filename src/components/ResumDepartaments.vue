<template>
 <div class="space-y-8">
 <!-- Connection indicator -->
 <div class="mb-4 flex items-center justify-between">
 <div class="flex items-center gap-2">
 <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
 :class="isConnected ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'">
 <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
 {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
 </div>
 </div>
 <div class="text-sm text-slate-600">
 Última actualització: {{ lastUpdate }}
 </div>
 </div>

 <div 
 v-for="departament in departamentsOrdenats" 
 :key="departament" 
 class="overflow-hidden card"
 >
 <div class="border-b border-slate-300 bg-slate-200 px-6 py-4">
 <h3 class="text-xl font-semibold text-slate-950">{{ departament }}</h3>
 <div class="mt-1 space-y-1">
 <p class="text-sm text-slate-700">
 Total hores assignades: <span class="font-semibold">{{ calcularTotalHoresDepartament(departament) }}</span>
 </p>
 <p class="text-sm text-slate-700">
 Professors necessaris: 
 <span 
 class="font-semibold"
 :class="getProfessorsClass(calcularProfessorsNecessaris(departament))"
 >
 {{ formatProfessorsNecessaris(calcularProfessorsNecessaris(departament)) }}
 </span>
 </p>
 </div>
 </div>
 
 <div class="p-6">
 <div class="space-y-4">
 <div 
 v-for="classe in sortClasses(departamentsInfo[departament])" 
 :key="classe.id"
 class="flex justify-between items-center p-4 bg-slate-100 rounded-lg border border-slate-300"
 >
 <div>
 <div class="flex items-center gap-2 mb-1">
 <p class="font-medium text-slate-950">{{ classe.materia }}</p>
 <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)" class="inline-flex items-center gap-1">
 {{ getTipusIcon(classe.tipus) }} {{ getTipusText(classe.tipus) }}
 </span>
 </div>
 <p class="text-sm text-slate-700">
 <span v-if="classe.curs || classe.grup">
 {{ classe.curs }} {{ classe.grup }}
 </span>
 <span v-else class="italic">
 Activitat de coordinació
 </span>
 </p>
 <p v-if="classe.professorAssignat" class="text-sm text-slate-700 mt-1">
 Prof: {{ classe.professorAssignat }}
 </p>
 </div>
 <div class="text-right">
 <p class="font-medium text-slate-950">
 {{ classe.hores }}h
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';

const cursStore = useCursStore();
const classes = ref([]);
const isConnected = ref(true);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

// Variables para los listeners
let classesUnsubscribe = null;

function updateLastUpdate() {
 lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getTipusIcon(tipus) {
 const iconMap = {
 'O': 'O', // Optativa
 'D': 'D', // Desdoblament
 'S': 'S', // Suport
 'A': 'A', // Autodesdoble
 'F': 'F', // Flexible
 'GP': 'GP', // Guàrdies de Pati
 'PALIC': 'PALIC', // PALIC
 'C': 'C',
 'CO': 'CO'
 };
 return iconMap[tipus] || 'Classe';
}

function getTipusText(tipus) {
 const tipusMap = {
 'O': 'Optativa',
 'D': 'Desdoblament',
 'S': 'Suport',
 'A': 'Autodesdoble',
 'F': 'Flexible',
 'GP': 'Guàrdies de Pati',
 'PALIC': 'PALIC',
 'C': 'Coordinació',
 'CO': 'Coordinació individual'
 };
 return tipusMap[tipus] || tipus;
}

function getTipusBadgeClass(tipus) {
 const classMap = {
 'O': 'badge badge-green',
 'D': 'badge badge-blue',
 'S': 'badge badge-yellow',
 'A': 'badge badge-purple',
 'F': 'badge badge-indigo',
 'GP': 'badge badge-red',
 'PALIC': 'badge badge-orange',
 'C': 'badge badge-purple',
 'CO': 'badge badge-purple'
 };
 return classMap[tipus] || 'badge badge-gray';
}

const departamentsInfo = computed(() => {
 const info = {};
 classes.value.forEach(classe => {
 if (!classe.departaments) return;
 classe.departaments.forEach(departament => {
 if (!info[departament]) {
 info[departament] = [];
 }
 info[departament].push(classe);
 });
 });
 return info;
});

const departamentsOrdenats = computed(() => {
 return Object.keys(departamentsInfo.value).sort();
});

function sortClasses(classes) {
 return [...classes].sort((a, b) => {
 // Primero las clases con curso/grupo
 const aHasGroup = a.curs || a.grup;
 const bHasGroup = b.curs || b.grup;
 
 if (aHasGroup && !bHasGroup) return -1;
 if (!aHasGroup && bHasGroup) return 1;
 
 // Si ambas tienen grupo o ambas no tienen grupo
 if (!a.curs && !b.curs) return a.materia.localeCompare(b.materia);
 if (!a.curs) return 1;
 if (!b.curs) return -1;
 if (a.curs !== b.curs) return a.curs.localeCompare(b.curs);
 if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
 return (a.grup || '').localeCompare(b.grup || '');
 });
}

function calcularTotalHoresDepartament(departament) {
 return departamentsInfo.value[departament].reduce((total, classe) => {
 return total + classe.hores;
 }, 0);
}

function calcularProfessorsNecessaris(departament) {
 const totalHores = calcularTotalHoresDepartament(departament);
 return totalHores / 18;
}

function formatProfessorsNecessaris(num) {
 const rounded = Math.round(num * 2) / 2;
 return rounded.toFixed(1).replace('.0', '');
}

function getProfessorsClass(num) {
 const rounded = Math.round(num * 2) / 2;
 const decimal = rounded % 1 !== 0;
 
 if (decimal) {
 return num > rounded 
 ? 'text-red-800'
 : 'text-amber-800 dark:text-yellow-400';
 }
 
 return 'text-green-600';
}

// Configurar listeners en tiempo real
function setupRealtimeListeners() {
 // Limpiar listeners existentes
 cleanupListeners();

 // Listener para classes
 const classesQuery = query(cursStore.col('classes'));
 classesUnsubscribe = onSnapshot(classesQuery, 
 (snapshot) => {
 classes.value = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 }));
 updateLastUpdate();
 isConnected.value = true;
 },
 (error) => {
 console.error('Error en listener de classes:', error);
 isConnected.value = false;
 }
 );
}

function cleanupListeners() {
 if (classesUnsubscribe) {
 classesUnsubscribe();
 classesUnsubscribe = null;
 }
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });

onUnmounted(() => {
 cleanupListeners();
});
</script>
