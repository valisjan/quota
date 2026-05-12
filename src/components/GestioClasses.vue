<template>
  <div class="container mx-auto p-4">
    <div
      v-if="settings.tancamentAdmin"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
    >
      Mode tancament d'administracio actiu. Consulta permesa, edicio bloquejada.
    </div>
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Gestió de Classes</h2>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manteniment</h3>
      <button @click="eliminarTotesClasses" class="btn-danger" :disabled="loading || settings.tancamentAdmin">
        🗑 Eliminar totes
      </button>
    </div>

    <!-- Search and Filter Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🔍 Cercar i Filtrar Classes</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <!-- Búsqueda general -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Cerca general
          </label>
          <input 
            v-model="searchFilters.general"
            type="text"
            placeholder="Matèria, curs, grup..."
            class="form-input w-full"
          />
        </div>
        
        <!-- Filtro por departamento -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Departament
          </label>
          <select v-model="searchFilters.departament" class="form-input w-full">
            <option value="">Tots els departaments</option>
            <option v-for="dep in departamentsSorted" :key="dep.id" :value="dep.nom">
              {{ dep.nom }}
            </option>
          </select>
        </div>
        
        <!-- Filtro por curso -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Curs
          </label>
          <input
            v-model="searchFilters.curs"
            type="text"
            placeholder="Ex: 1ESO"
            class="form-input w-full"
          />
        </div>
        
        <!-- Filtro por tipo -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tipus
          </label>
          <select v-model="searchFilters.tipus" class="form-input w-full">
            <option value="">Tots els tipus</option>
            <option value="">Normal</option>
            <option value="O">Optativa</option>
            <option value="D">Desdoblament</option>
            <option value="S">Suport</option>
            <option value="A">Autodesdoble</option>
            <option value="F">Flexible</option>
            <option value="GP">Guàrdies de Pati</option>
            <option value="PALIC">PALIC</option>
          </select>
        </div>
      </div>
      
      <!-- Filtro por profesor -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Professor assignat
          </label>
          <select v-model="searchFilters.professor" class="form-input w-full">
            <option value="">Tots els professors</option>
            <option value="sense-assignar">Sense assignar</option>
            <option v-for="prof in professors" :key="prof.id" :value="prof.nom">
              {{ prof.nom }}
            </option>
          </select>
        </div>
        
        <!-- Botón para limpiar filtros -->
        <div class="flex items-end">
          <button @click="clearFilters" class="btn-secondary w-full">
            🗑️ Netejar filtres
          </button>
        </div>
      </div>
      
      <!-- Estadísticas de búsqueda -->
      <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <span v-if="hasStructuredFilters">
            Mostrant <strong>{{ classesFiltrades.length }}</strong> de <strong>{{ classes.length }}</strong> classes carregades
            (filtrades)
          </span>
          <span v-else>
            Tria com a minim un filtre de departament, curs, tipus o professor per carregar classes.
          </span>
        </p>
      </div>
    </div>

    <!-- Classes list grouped by department -->
    <div v-if="hasStructuredFilters" class="space-y-8">
      <div v-for="departament in departamentsAmbClasses" :key="departament" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div class="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ departament }}</h3>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ getClassesByDepartamentFiltrades(departament).length }} classes
            </span>
          </div>
        </div>
        
        <div class="p-6 space-y-4">
          <div 
            v-for="classe in getClassesByDepartamentFiltrades(departament)" 
            :key="classe.id" 
            class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Matèria</label>
                <input 
                  v-model="classe.materia"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  type="text"
                  class="form-input w-full"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Curs</label>
                <input 
                  v-model="classe.curs"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  type="text"
                  class="form-input w-full"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Grup</label>
                <input 
                  v-model="classe.grup"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  type="text"
                  class="form-input w-full"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Hores</label>
                <input 
                  v-model.number="classe.hores"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  type="number"
                  min="1"
                  class="form-input w-full"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipus</label>
                <select 
                  v-model="classe.tipus"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input w-full"
                >
                  <option value="">Normal</option>
                  <option value="O">Optativa</option>
                  <option value="D">Desdoblament</option>
                  <option value="S">Suport</option>
                  <option value="A">Autodesdoble</option>
                  <option value="F">Flexible</option>
                  <option value="GP">Guàrdies de Pati</option>
                  <option value="PALIC">PALIC</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Departament</label>
                <select 
                  v-model="classe.departaments[0]"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input w-full"
                  required
                >
                  <option value="">Selecciona un departament</option>
                  <option v-for="dep in departamentsSorted" :key="dep.id" :value="dep.nom">
                    {{ dep.nom }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Professor</label>
                <select 
                  v-model="classe.professorAssignat"
                  @change="actualitzarClasse(classe)"
                  :disabled="settings.tancamentAdmin"
                  class="form-input w-full"
                >
                  <option value="">Sense assignar</option>
                  <option v-for="prof in professors" :key="prof.id" :value="prof.nom">
                    {{ prof.nom }}
                  </option>
                </select>
              </div>
              <div class="flex items-end">
                <button 
                  @click="eliminarClasse(classe.id)"
                  :disabled="settings.tancamentAdmin"
                  class="btn-danger w-full"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje cuando no hay resultados -->
    <div v-if="!hasStructuredFilters" class="text-center py-12">
      <div class="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aplica un filtre</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Les classes no es carreguen fins que filtres per departament, curs, tipus o professor.
      </p>
    </div>

    <div v-else-if="classesFiltrades.length === 0" class="text-center py-12">
      <div class="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No s'han trobat classes</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Prova a modificar els filtres de cerca per trobar el que busques.
      </p>
      <button @click="clearFilters" class="btn-primary">
        Netejar filtres
      </button>
    </div>

    <p v-if="error" class="text-red-500 dark:text-red-400 mt-4">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';

const classes = ref([]);
const departaments = ref([]);
const professors = ref([]);
const error = ref('');
const loading = ref(false);
const settings = ref({ ...DEFAULT_APP_SETTINGS });
let settingsUnsubscribe = null;

// Filtros de búsqueda
const searchFilters = ref({
  general: '',
  departament: '',
  curs: '',
  tipus: '',
  professor: ''
});

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

const hasStructuredFilters = computed(() => {
  return Boolean(
    searchFilters.value.departament ||
      searchFilters.value.curs ||
      searchFilters.value.tipus ||
      searchFilters.value.professor
  );
});

const structuredFilterKey = computed(() => {
  return [
    searchFilters.value.departament,
    searchFilters.value.curs,
    searchFilters.value.tipus,
    searchFilters.value.professor,
  ].join('|');
});

// Computed para filtrar classes
const classesFiltrades = computed(() => {
  if (!hasStructuredFilters.value) return [];

  let filtered = [...classes.value];
  
  // Filtro general (busca en materia, curs, grup)
  if (searchFilters.value.general) {
    const searchTerm = searchFilters.value.general.toLowerCase();
    filtered = filtered.filter(classe => 
      (classe.materia && classe.materia.toLowerCase().includes(searchTerm)) ||
      (classe.curs && classe.curs.toLowerCase().includes(searchTerm)) ||
      (classe.grup && classe.grup.toLowerCase().includes(searchTerm))
    );
  }
  
  // Filtro por departamento
  if (searchFilters.value.departament) {
    filtered = filtered.filter(classe => 
      classe.departaments?.[0] === searchFilters.value.departament
    );
  }
  
  // Filtro por curso
  if (searchFilters.value.curs) {
    filtered = filtered.filter(classe => 
      classe.curs === searchFilters.value.curs
    );
  }
  
  // Filtro por tipo
  if (searchFilters.value.tipus !== '') {
    filtered = filtered.filter(classe => 
      classe.tipus === searchFilters.value.tipus
    );
  }
  
  // Filtro por profesor
  if (searchFilters.value.professor) {
    if (searchFilters.value.professor === 'sense-assignar') {
      filtered = filtered.filter(classe => 
        !classe.professorAssignat || classe.professorAssignat === ''
      );
    } else {
      filtered = filtered.filter(classe => 
        classe.professorAssignat === searchFilters.value.professor
      );
    }
  }
  
  return filtered;
});

// Computed para obtener departamentos que tienen clases filtradas
const departamentsAmbClasses = computed(() => {
  const depts = [...new Set(classesFiltrades.value
    .map(c => c.departaments?.[0])
    .filter(d => d)
  )].sort();
  return depts;
});

function getClassesByDepartamentFiltrades(departament) {
  return classesFiltrades.value
    .filter(classe => classe.departaments?.[0] === departament)
    .sort((a, b) => {
      // Primero ordenar por materia alfabéticamente
      if (a.materia !== b.materia) {
        return a.materia.localeCompare(b.materia);
      }
      
      // Si la materia es la misma, ordenar por curso
      if (a.curs !== b.curs) {
        // Si uno no tiene curso, va al final
        if (!a.curs && b.curs) return 1;
        if (a.curs && !b.curs) return -1;
        if (!a.curs && !b.curs) return 0;
        return a.curs.localeCompare(b.curs);
      }
      
      // Si curso y materia son iguales, ordenar por grupo
      if (a.grup !== b.grup) {
        // Si uno no tiene grupo, va al final
        if (!a.grup && b.grup) return 1;
        if (a.grup && !b.grup) return -1;
        if (!a.grup && !b.grup) return 0;
        return a.grup.localeCompare(b.grup);
      }
      
      return 0;
    });
}

function clearFilters() {
  searchFilters.value = {
    general: '',
    departament: '',
    curs: '',
    tipus: '',
    professor: ''
  };
  classes.value = [];
}

function getClassesByDepartament(departament) {
  return classes.value
    .filter(classe => classe.departaments?.[0] === departament)
    .sort((a, b) => {
      // Primero ordenar por materia alfabéticamente
      if (a.materia !== b.materia) {
        return a.materia.localeCompare(b.materia);
      }
      
      // Si la materia es la misma, ordenar por curso
      if (a.curs !== b.curs) {
        // Si uno no tiene curso, va al final
        if (!a.curs && b.curs) return 1;
        if (a.curs && !b.curs) return -1;
        if (!a.curs && !b.curs) return 0;
        return a.curs.localeCompare(b.curs);
      }
      
      // Si curso y materia son iguales, ordenar por grupo
      if (a.grup !== b.grup) {
        // Si uno no tiene grupo, va al final
        if (!a.grup && b.grup) return 1;
        if (a.grup && !b.grup) return -1;
        if (!a.grup && !b.grup) return 0;
        return a.grup.localeCompare(b.grup);
      }
      
      return 0;
    });
}

async function carregarClasses() {
  if (!hasStructuredFilters.value) {
    classes.value = [];
    return;
  }

  try {
    const constraints = [];

    if (searchFilters.value.professor) {
      constraints.push(
        where(
          'professorAssignat',
          '==',
          searchFilters.value.professor === 'sense-assignar'
            ? ''
            : searchFilters.value.professor
        )
      );
    } else if (searchFilters.value.departament) {
      constraints.push(
        where('departaments', 'array-contains', searchFilters.value.departament)
      );
    } else if (searchFilters.value.curs) {
      constraints.push(where('curs', '==', searchFilters.value.curs));
    } else if (searchFilters.value.tipus) {
      constraints.push(where('tipus', '==', searchFilters.value.tipus));
    }

    const classesQuery = query(collection(db, 'classes'), ...constraints);
    const snapshot = await getDocs(classesQuery);
    classes.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      departaments: doc.data().departaments || [doc.data().departament].filter(Boolean)
    }));
  } catch (err) {
    console.error('Error carregant classes:', err);
    error.value = 'Error carregant les classes';
  }
}

async function carregarDepartaments() {
  try {
    const snapshot = await getDocs(collection(db, 'departaments'));
    departaments.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Error carregant departaments:', err);
    error.value = 'Error carregant els departaments';
  }
}

async function carregarProfessors() {
  try {
    const snapshot = await getDocs(collection(db, 'professors'));
    professors.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Error carregant professors:', err);
    error.value = 'Error carregant els professors';
  }
}

async function eliminarTotesClasses() {
  if (settings.value.tancamentAdmin) return;
  const confirmacio = confirm(
    'Estàs segur que vols eliminar totes les classes? Aquesta acció no es pot desfer i també eliminarà totes les assignacions de professors.'
  );
  if (!confirmacio) return;

  loading.value = true;
  error.value = null;
  
  try {
    const snapshot = await getDocs(collection(db, 'classes'));
    for (const docu of snapshot.docs) {
      await deleteDoc(doc(db, 'classes', docu.id));
    }
    classes.value = [];
    alert('Totes les classes i assignacions han estat eliminades correctament');
  } catch (err) {
    console.error('Error eliminant classes:', err);
    error.value = 'Error eliminant les classes';
  } finally {
    loading.value = false;
  }
}

async function eliminarClasse(id) {
  if (settings.value.tancamentAdmin) return;
  const classe = classes.value.find(c => c.id === id);
  let confirmMessage = 'Estàs segur que vols eliminar aquesta classe?';
  
  // Si la clase tiene profesor asignado, avisar que se eliminará la asignación
  if (classe && classe.professorAssignat) {
    confirmMessage = `Estàs segur que vols eliminar aquesta classe?\n\nAixò també eliminarà l'assignació del professor "${classe.professorAssignat}".`;
  }
  
  if (!confirm(confirmMessage)) return;
  
  try {
    await deleteDoc(doc(db, 'classes', id));
    if (hasStructuredFilters.value) await carregarClasses();
    error.value = '';
    
    // Mostrar mensaje confirmando la eliminación
    if (classe && classe.professorAssignat) {
      alert(`Classe eliminada correctament. L'assignació del professor "${classe.professorAssignat}" també ha estat eliminada.`);
    }
  } catch (err) {
    console.error('Error eliminant classe:', err);
    error.value = 'Error eliminant la classe';
  }
}

async function actualitzarClasse(classe) {
  if (settings.value.tancamentAdmin) return;
  if (!classe.departaments[0]) {
    error.value = 'Has de seleccionar un departament';
    return;
  }

  try {
    const docRef = doc(db, 'classes', classe.id);
    await updateDoc(docRef, {
      materia: classe.materia,
      curs: classe.curs || '',
      grup: classe.grup || '',
      hores: parseInt(classe.hores),
      departaments: [classe.departaments[0]],
      tipus: classe.tipus || '',
      professorAssignat: classe.professorAssignat || ''
    });
    error.value = '';
  } catch (err) {
    console.error('Error actualitzant classe:', err);
    error.value = 'Error actualitzant la classe';
    if (hasStructuredFilters.value) await carregarClasses();
  }
}

onMounted(async () => {
  if (!db) {
    error.value = 'Error: Base de dades no inicialitzada';
    return;
  }
  await Promise.all([carregarDepartaments(), carregarProfessors()]);
  settingsUnsubscribe = subscribeAppSettings((value) => {
    settings.value = value;
  });
});

onUnmounted(() => {
  settingsUnsubscribe?.();
});

watch(structuredFilterKey, async () => {
  error.value = '';
  await carregarClasses();
});
</script>
