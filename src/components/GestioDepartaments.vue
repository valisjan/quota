<template>
  <div class="form-container">
    <h2 class="form-title">Gestio de Departaments</h2>

    <div class="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        Els departaments es creen a partir de la segona columna de la pestanya
        Professorat del full de càlcul. Per afegir o canviar un departament,
        modifica el full i sincronitza.
      </p>
    </div>

    <div v-if="loading" class="alert alert-info">
      Carregant...
    </div>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>

    <div class="list-container">
      <h3 class="list-header">Departaments ({{ departaments.length }})</h3>

      <div
        v-if="departaments.length === 0"
        class="p-8 text-center text-gray-600 dark:text-gray-400"
      >
        No hi ha departaments. Sincronitza amb Google Sheets.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="table-header">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nom</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="dep in departamentsSorted"
              :key="dep.id"
              class="table-row"
            >
              <td class="px-6 py-4 whitespace-nowrap table-cell">
                {{ dep.nom }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const departaments = ref([]);
const loading = ref(false);
const error = ref(null);

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

async function carregarDepartaments() {
  loading.value = true;
  error.value = null;

  try {
    const snapshot = await getDocs(collection(db, 'departaments'));
    departaments.value = snapshot.docs.map((docu) => ({
      id: docu.id,
      ...docu.data(),
    }));
  } catch (err) {
    console.error('Error carregant departaments:', err);
    error.value = 'Error carregant els departaments';
  } finally {
    loading.value = false;
  }
}

onMounted(carregarDepartaments);
</script>
