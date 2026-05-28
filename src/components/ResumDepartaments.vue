<template>
  <div class="space-y-8">
    <!-- Connection indicator -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
             :class="isConnected ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'">
          <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
          {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
        </div>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Última actualització: {{ lastUpdate }}
      </div>
    </div>

    <div 
      v-for="departament in departamentsOrdenats" 
      :key="departament" 
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ departament }}</h3>
        <div class="mt-1 space-y-1">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Total hores assignades: <span class="font-semibold">{{ calcularTotalHoresDepartament(departament) }}</span>
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
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
            class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div>
              <div class="flex items-center gap-2 mb-1">
                <p class="font-medium text-gray-900 dark:text-white">{{ classe.materia }}</p>
                <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)" class="inline-flex items-center gap-1">
                  {{ getTipusIcon(classe.tipus) }} {{ getTipusText(classe.tipus) }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                <span v-if="classe.curs || classe.grup">
                  {{ classe.curs }} {{ classe.grup }}
                </span>
                <span v-else class="italic">
                  Activitat de coordinació
                </span>
              </p>
              <p v-if="classe.professorAssignat" class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Prof: {{ classe.professorAssignat }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-medium text-gray-900 dark:text-white">
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
    'C': 'C' // Coordinació
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
    'C': 'Coordinació'
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
    'C': 'badge badge-purple'
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
      ? 'text-red-600 dark:text-red-400'
      : 'text-yellow-600 dark:text-yellow-400';
  }
  
  return 'text-green-600 dark:text-green-400';
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
