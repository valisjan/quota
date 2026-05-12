<template>
  <div class="container mx-auto p-4">
    <div v-if="loading" class="alert alert-info">
      Carregant dades...
    </div>
    
    <div v-else class="space-y-4">
      <!-- Indicador de sincronización -->
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

      <!-- Mostrar total de GP del departamento -->
      <div
        v-if="departamentTancat"
        class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      >
        Mode tancament actiu. Els controls de GP, PALIC i preferències estan bloquejats.
      </div>
      <div v-if="props.departamentSeleccionat" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
        <div class="flex justify-between items-center mb-2">
          <p class="text-gray-900 dark:text-white">
            Total Guàrdies de Pati del departament: <strong>{{ totalGPDepartament }}</strong>
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            Assignades: {{ totalGPAssignades }} / {{ totalGPDepartament }}
          </p>
        </div>
        <!-- Solo mostrar PALIC si el departamento tiene PALIC asignado -->
        <div v-if="totalPALICDepartament > 0" class="flex justify-between items-center">
          <p class="text-gray-900 dark:text-white">
            Total PALIC del departament: <strong>{{ totalPALICDepartament }}</strong>
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            Assignades: {{ totalPALICAssignades }} / {{ totalPALICDepartament }}
          </p>
        </div>
      </div>

      <div 
        v-for="professor in professorsFiltrats" 
        :key="professor.id" 
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ professor.nom }}</h3>
            <div class="mt-1 space-x-2">
              <span class="badge badge-blue">{{ professor.departament }}</span>
              <span v-if="professor.preferencia" :class="getPreferenciaBadgeClass(professor.preferencia)">
                {{ getPreferenciaText(professor.preferencia) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Hores lectives: 
                <strong :class="getHoresClass(professor, calcularHoresLectives(professor.nom))">
                  {{ calcularHoresLectives(professor.nom) }}
                </strong>
              </p>
              <!-- Warning messages -->
              <div v-if="calcularHoresLectives(professor.nom) > getLimitsProfessor(professor.nom).maxim" class="mt-1 text-sm text-red-600 dark:text-red-400">
                ⚠️ El professor supera les hores lectives permeses
              </div>
              <div v-else-if="calcularHoresLectives(professor.nom) > getLimitsProfessor(professor.nom).ideal && calcularHoresLectives(professor.nom) <= getLimitsProfessor(professor.nom).maxim" class="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                ℹ️ El professor supera les hores recomanades per la seva jornada
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <p class="font-medium text-gray-900 dark:text-white">Guàrdies de Pati:</p>
                <div class="flex items-center gap-1">
                  <button 
                    @click="decrementarGP(professor)"
                    class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-l hover:bg-gray-300 dark:hover:bg-gray-500"
                    :disabled="departamentTancat || getHoresGP(professor.nom) === 0"
                  >
                    -
                  </button>
                  <span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 font-bold">
                    {{ getHoresGP(professor.nom) }}
                  </span>
                  <button 
                    @click="incrementarGP(professor)"
                    class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-r hover:bg-gray-300 dark:hover:bg-gray-500"
                    :disabled="departamentTancat || totalGPAssignades >= totalGPDepartament"
                  >
                    +
                  </button>
                </div>
              </div>
              <!-- Solo mostrar controles de PALIC si el departamento tiene PALIC -->
              <div v-if="totalPALICDepartament > 0" class="flex items-center gap-2">
                <p class="font-medium text-gray-900 dark:text-white">PALIC:</p>
                <div class="flex items-center gap-1">
                  <button 
                    @click="decrementarPALIC(professor)"
                    class="px-2 py-1 bg-orange-200 dark:bg-orange-600 rounded-l hover:bg-orange-300 dark:hover:bg-orange-500"
                    :disabled="departamentTancat || getHoresPALIC(professor.nom) === 0"
                  >
                    -
                  </button>
                  <span class="px-3 py-1 bg-orange-100 dark:bg-orange-800 font-bold text-orange-800 dark:text-orange-100">
                    {{ getHoresPALIC(professor.nom) }}
                  </span>
                  <button 
                    @click="incrementarPALIC(professor)"
                    class="px-2 py-1 bg-orange-200 dark:bg-orange-600 rounded-r hover:bg-orange-300 dark:hover:bg-orange-500"
                    :disabled="departamentTancat || totalPALICAssignades >= totalPALICDepartament"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferencias horarias -->
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center gap-4">
              <label class="font-medium text-gray-900 dark:text-white">
                Preferència horària:
                <select 
                  v-model="professor.preferencia"
                  @change="actualitzarProfessor(professor)"
                  class="form-input ml-2 text-sm py-1"
                >
                  <option value="">Sense preferència</option>
                  <option value="pronto">Entrar prest</option>
                  <option value="tarde">Entrar tard</option>
                </select>
              </label>
            </div>
          </div>

          <!-- Comentarios -->
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label class="block font-medium text-gray-900 dark:text-white mb-2">
              Comentaris:
            </label>
            <textarea 
              v-model="professor.comentaris"
              @change="actualitzarProfessor(professor)"
              class="form-input text-sm w-full"
              rows="2"
              placeholder="Afegeix comentaris sobre preferències o necessitats específiques"
            ></textarea>
          </div>
          
          <div class="space-y-2">
            <div 
              v-for="classe in sortClasses(classesLectives(professor.nom))" 
              :key="classe.id" 
              class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-900 dark:text-white">{{ classe.materia }}</span>
                <span class="text-gray-700 dark:text-gray-300">{{ horesComputablesClasse(classe) }}h</span>
              </div>
              <div class="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {{ classe.curs }} {{ classe.grup }}
                <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)" class="ml-2">
                  {{ getTipusText(classe.tipus) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  serverTimestamp 
} from 'firebase/firestore';
import { limitsHoresProfessor, professorsClasse, classeAssignadaA, horesComputablesClasse } from '../utils/horesProfessor';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';

const props = defineProps({
  departamentSeleccionat: {
    type: String,
    default: ''
  }
});

const classes = ref([]);
const professors = ref([]);
const loading = ref(true);
const isConnected = ref(true);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
const settings = ref({ ...DEFAULT_APP_SETTINGS });

// Variables para los listeners
let classesUnsubscribe = null;
let professorsUnsubscribe = null;
let settingsUnsubscribe = null;

const departamentTancat = computed(() =>
  Boolean(
    props.departamentSeleccionat &&
      settings.value.departamentsTancats?.[props.departamentSeleccionat]?.tancat
  )
);

function updateLastUpdate() {
  lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getPreferenciaText(preferencia) {
  const preferenciaMap = {
    'pronto': 'Entrar prest',
    'tarde': 'Entrar tard'
  };
  return preferenciaMap[preferencia] || preferencia;
}

function getPreferenciaBadgeClass(preferencia) {
  const classMap = {
    'pronto': 'badge badge-green',
    'tarde': 'badge badge-purple'
  };
  return classMap[preferencia] || 'badge badge-gray';
}

// Obtener el total de GP del departamento de las clases existentes
const totalGPDepartament = computed(() => {
  if (!props.departamentSeleccionat) return 0;
  const classesGP = classes.value.find(c => 
    c.tipus === 'GP' && 
    c.departaments[0] === props.departamentSeleccionat &&
    !c.professorAssignat // La clase GP sin profesor asignado contiene el total
  );
  return classesGP ? classesGP.hores : 0;
});

// Calcular total de GP asignadas
const totalGPAssignades = computed(() => {
  if (!props.departamentSeleccionat) return 0;
  return classes.value
    .filter(c => 
      c.tipus === 'GP' && 
      c.departaments[0] === props.departamentSeleccionat &&
      c.professorAssignat // Solo contar las GP asignadas a profesores
    )
    .reduce((total, c) => total + c.hores, 0);
});

// Obtener el total de PALIC del departamento
const totalPALICDepartament = computed(() => {
  if (!props.departamentSeleccionat) return 0;
  const classesPALIC = classes.value.find(c => 
    c.tipus === 'PALIC' && 
    c.departaments[0] === props.departamentSeleccionat &&
    !c.professorAssignat // La clase PALIC sin profesor asignado contiene el total
  );
  return classesPALIC ? classesPALIC.hores : 0;
});

// Calcular total de PALIC asignadas
const totalPALICAssignades = computed(() => {
  if (!props.departamentSeleccionat) return 0;
  return classes.value
    .filter(c => 
      c.tipus === 'PALIC' && 
      c.departaments[0] === props.departamentSeleccionat &&
      c.professorAssignat // Solo contar las PALIC asignadas a profesores
    )
    .reduce((total, c) => total + c.hores, 0);
});

function getTipusText(tipus) {
  const normal = (tipus || '').toString().toUpperCase().trim();
  if (normal.startsWith('T')) return 'Optativa compartida';
  if (normal.startsWith('O')) return 'Optativa';

  const tipusMap = {
    'O': 'Optativa',
    'D': 'Desdoblament',
    'S': 'Suport',
    'A': 'Autodesdoble',
    'F': 'Flexible',
    'GP': 'Guàrdies de Pati',
    'PALIC': 'PALIC'
  };
  return tipusMap[tipus] || tipus;
}

function getTipusBadgeClass(tipus) {
  const normal = (tipus || '').toString().toUpperCase().trim();
  if (normal.startsWith('O') || normal.startsWith('T')) return 'badge badge-green';

  const classMap = {
    'O': 'badge badge-green',
    'D': 'badge badge-blue',
    'S': 'badge badge-yellow',
    'A': 'badge badge-purple',
    'F': 'badge badge-indigo',
    'GP': 'badge badge-red',
    'PALIC': 'badge badge-orange'
  };
  return classMap[tipus] || 'badge badge-gray';
}

function getProfessor(nomProfessor) {
  return professors.value.find((professor) => professor.nom === nomProfessor) || {};
}

function getLimitsProfessor(nomProfessor) {
  return limitsHoresProfessor(getProfessor(nomProfessor));
}

function getHoresClass(professor, hores) {
  const limits = limitsHoresProfessor(professor);
  if (hores < limits.ideal) return 'text-red-600 dark:text-red-400';
  if (hores === limits.ideal) return 'text-green-600 dark:text-green-400';
  if (hores > limits.maxim) return 'text-red-600 dark:text-red-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    if (a.curs !== b.curs) return a.curs.localeCompare(b.curs);
    if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
    return (a.grup || '').localeCompare(b.grup || '');
  });
}

function classesLectives(nomProfessor) {
  return classes.value.filter(classe => 
    classeAssignadaA(classe, nomProfessor) &&
    classe.tipus !== 'GP' // PALIC sí se muestra en la lista
  );
}

function calcularHoresLectives(nomProfessor) {
  return classesLectives(nomProfessor)
    .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
}

function getHoresGP(nomProfessor) {
  const classeGP = classes.value.find(classe => 
    classeAssignadaA(classe, nomProfessor) &&
    classe.tipus === 'GP'
  );
  return classeGP ? classeGP.hores : 0;
}

function getHoresPALIC(nomProfessor) {
  const classePALIC = classes.value.find(classe => 
    classeAssignadaA(classe, nomProfessor) &&
    classe.tipus === 'PALIC'
  );
  return classePALIC ? classePALIC.hores : 0;
}

async function actualitzarProfessor(professor) {
  if (departamentTancat.value) return;
  try {
    const docRef = doc(db, 'professors', professor.id);
    await updateDoc(docRef, {
      preferencia: professor.preferencia || '',
      comentaris: professor.comentaris || '',
      lastModified: serverTimestamp()
    });
  } catch (error) {
    console.error('Error actualitzant professor:', error);
    isConnected.value = false;
  }
}

async function incrementarGP(professor) {
  if (departamentTancat.value) return;
  if (totalGPAssignades.value >= totalGPDepartament.value) return;

  let classeGP = classes.value.find(classe => 
    classe.professorAssignat === professor.nom && 
    classe.tipus === 'GP'
  );

  try {
    if (classeGP) {
      // Actualizar clase GP existente
      const docRef = doc(db, 'classes', classeGP.id);
      await updateDoc(docRef, { 
        hores: classeGP.hores + 1,
        lastModified: serverTimestamp()
      });
    } else {
      // Crear nueva clase GP
      const nuevaClaseGP = {
        materia: 'Guàrdies de Pati',
        tipus: 'GP',
        hores: 1,
        professorAssignat: professor.nom,
        departaments: [professor.departament],
        curs: '',
        grup: '',
        lastModified: serverTimestamp()
      };
      await addDoc(collection(db, 'classes'), nuevaClaseGP);
    }
  } catch (error) {
    console.error('Error incrementant GP:', error);
    isConnected.value = false;
  }
}

async function decrementarGP(professor) {
  if (departamentTancat.value) return;
  const classeGP = classes.value.find(classe => 
    classe.professorAssignat === professor.nom && 
    classe.tipus === 'GP'
  );

  if (!classeGP || classeGP.hores <= 0) return;

  try {
    if (classeGP.hores === 1) {
      // Eliminar la clase GP si llega a 0
      await deleteDoc(doc(db, 'classes', classeGP.id));
    } else {
      // Decrementar las horas
      const docRef = doc(db, 'classes', classeGP.id);
      await updateDoc(docRef, { 
        hores: classeGP.hores - 1,
        lastModified: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error decrementant GP:', error);
    isConnected.value = false;
  }
}

async function incrementarPALIC(professor) {
  if (departamentTancat.value) return;
  if (totalPALICAssignades.value >= totalPALICDepartament.value) return;

  let classePALIC = classes.value.find(classe => 
    classe.professorAssignat === professor.nom && 
    classe.tipus === 'PALIC'
  );

  try {
    if (classePALIC) {
      // Actualizar clase PALIC existente
      const docRef = doc(db, 'classes', classePALIC.id);
      await updateDoc(docRef, { 
        hores: classePALIC.hores + 1,
        lastModified: serverTimestamp()
      });
    } else {
      // Crear nueva clase PALIC
      const nuevaClasePALIC = {
        materia: 'PALIC',
        tipus: 'PALIC',
        hores: 1,
        professorAssignat: professor.nom,
        departaments: [professor.departament],
        curs: '',
        grup: '',
        lastModified: serverTimestamp()
      };
      await addDoc(collection(db, 'classes'), nuevaClasePALIC);
    }
  } catch (error) {
    console.error('Error incrementant PALIC:', error);
    isConnected.value = false;
  }
}

async function decrementarPALIC(professor) {
  if (departamentTancat.value) return;
  const classePALIC = classes.value.find(classe => 
    classe.professorAssignat === professor.nom && 
    classe.tipus === 'PALIC'
  );

  if (!classePALIC || classePALIC.hores <= 0) return;

  try {
    if (classePALIC.hores === 1) {
      // Eliminar la clase PALIC si llega a 0
      await deleteDoc(doc(db, 'classes', classePALIC.id));
    } else {
      // Decrementar las horas
      const docRef = doc(db, 'classes', classePALIC.id);
      await updateDoc(docRef, { 
        hores: classePALIC.hores - 1,
        lastModified: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error decrementant PALIC:', error);
    isConnected.value = false;
  }
}

// Configurar listeners en tiempo real
function setupRealtimeListeners() {
  // Limpiar listeners existentes
  cleanupListeners();

  // Listener para classes
  const classesQuery = query(collection(db, 'classes'));
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

  // Listener para professors
  const professorsQuery = query(collection(db, 'professors'));
  professorsUnsubscribe = onSnapshot(professorsQuery,
    (snapshot) => {
      professors.value = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          preferencia: doc.data().preferencia || '',
          jornada: doc.data().jornada || '',
          comentaris: doc.data().comentaris || ''
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom));
      updateLastUpdate();
      isConnected.value = true;
    },
    (error) => {
      console.error('Error en listener de professors:', error);
      isConnected.value = false;
    }
  );

  settingsUnsubscribe = subscribeAppSettings((value) => {
    settings.value = value;
  });
}

function cleanupListeners() {
  if (classesUnsubscribe) {
    classesUnsubscribe();
    classesUnsubscribe = null;
  }
  if (professorsUnsubscribe) {
    professorsUnsubscribe();
    professorsUnsubscribe = null;
  }
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
    settingsUnsubscribe = null;
  }
}

const professorsFiltrats = computed(() => {
  return professors.value.filter(professor => 
    !props.departamentSeleccionat || professor.departament === props.departamentSeleccionat
  );
});

onMounted(async () => {
  try {
    setupRealtimeListeners();
  } catch (error) {
    console.error('Error carregant dades:', error);
    alert('Error carregant les dades. Si us plau, refresca la pàgina.');
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  cleanupListeners();
});

defineExpose({
  carregarDades: setupRealtimeListeners
});
</script>
