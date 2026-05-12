<template>
  <div class="max-w-3xl space-y-5">
    <!-- Nota sobre pre-autorització -->
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Pots pre-autoritzar professorat des del full de Google Sheets. Afegeix les columnes <strong>EMAIL</strong> i <strong>ROL</strong> a la pestanya <em>Professorat</em> (columnes F i G). Els valors vàlids de ROL són <code class="rounded bg-slate-200 px-1">professor</code>, <code class="rounded bg-slate-200 px-1">cap_departament</code> i <code class="rounded bg-slate-200 px-1">admin</code>. La propera sincronització els activarà automàticament en fer login.
    </div>

    <!-- Pendents d'aprovació -->
    <div
      v-if="pendents.length"
      class="rounded-lg border border-amber-200 bg-amber-50 p-5"
    >
      <h3 class="text-base font-semibold text-slate-900">
        Pendents d'aprovació ({{ pendents.length }})
      </h3>
      <p class="mt-1 text-sm text-slate-600">
        Aquests usuaris han iniciat sessió però encara no tenen rol assignat.
      </p>
      <div class="mt-3 space-y-2">
        <div
          v-for="u in pendents"
          :key="u.id"
          class="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <img v-if="u.photoURL" :src="u.photoURL" class="h-8 w-8 rounded-md" referrerpolicy="no-referrer" />
            <div v-else class="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-600">
              {{ (u.nom || u.email || '?')[0].toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ u.nom }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ u.email }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="assignarRol(u, 'admin')"
              class="rounded-md bg-[#0024B6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#001A8A]"
            >
              Admin
            </button>
            <div class="flex items-center gap-1">
              <button
                @click="assignarRolDept(u)"
                class="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
              >
                Cap de dept.
              </button>
              <select
                v-model="deptPendent[u.id]"
                class="rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-6 text-xs"
              >
                <option value="">— tria dept —</option>
                <option v-for="d in departaments" :key="d.nom" :value="d.nom">{{ d.nom }}</option>
              </select>
            </div>
            <button
              @click="assignarRol(u, 'professor')"
              class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Professor
            </button>
            <button
              @click="eliminarUsuari(u)"
              class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Rebutjar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Usuaris actius -->
    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-lg font-semibold text-slate-950">Usuaris actius</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ actius.length }} usuari{{ actius.length !== 1 ? 's' : '' }} amb accés a l'aplicació.
        </p>
      </div>

      <div v-if="!actius.length" class="p-5 text-sm text-slate-400 dark:text-slate-500">
        Cap usuari actiu encara.
      </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="u in actius"
          :key="u.id"
          class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
        >
          <!-- Avatar + nom -->
          <div class="flex flex-1 items-center gap-3">
            <img v-if="u.photoURL" :src="u.photoURL" class="h-9 w-9 rounded-md" referrerpolicy="no-referrer" />
            <div v-else class="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
              {{ (u.nom || u.email || '?')[0].toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ u.nom }}</p>
                <span
                  v-if="u.id === authStore.uid"
                  class="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                >tu</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ u.email }}</p>
            </div>
          </div>

          <!-- Controls de rol -->
          <div class="flex flex-wrap items-center gap-2">
            <select
              :value="u.rol"
              @change="canviarRol(u, $event.target.value)"
              :disabled="u.id === authStore.uid"
              class="rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-6 text-sm font-medium dark:border-slate-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="admin">Admin</option>
              <option value="cap_departament">Cap de departament</option>
              <option v-if="u.rol === 'departament'" value="departament">Cap de departament</option>
              <option value="professor">Professor</option>
            </select>

            <select
              v-if="u.rol === 'cap_departament' || u.rol === 'departament'"
              :value="u.departament || ''"
              @change="canviarDepartament(u, $event.target.value)"
              class="rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-6 text-sm dark:border-slate-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— cap departament —</option>
              <option v-for="d in departaments" :key="d.nom" :value="d.nom">{{ d.nom }}</option>
            </select>

            <button
              v-if="u.id !== authStore.uid"
              @click="eliminarUsuari(u)"
              class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';

const authStore = useAuthStore();
const cursStore = useCursStore();
const usuaris = ref([]);
const departaments = ref([]);
const deptPendent = ref({});
const error = ref('');
let unsubs = [];

watch(() => cursStore.cursActiuId, () => {
  unsubs.forEach((u) => u());
  unsubs = [
    onSnapshot(collection(db, 'usuaris'), (snap) => {
      usuaris.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }),
    onSnapshot(cursStore.col('departaments'), (snap) => {
      departaments.value = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
    }),
  ];
}, { immediate: true });

onUnmounted(() => unsubs.forEach((u) => u()));

const pendents = computed(() => usuaris.value.filter((u) => !u.rol));
const actius = computed(() =>
  usuaris.value
    .filter((u) => u.rol)
    .sort((a, b) => {
      if (a.rol === 'admin' && b.rol !== 'admin') return -1;
      if (b.rol === 'admin' && a.rol !== 'admin') return 1;
      return (a.nom || '').localeCompare(b.nom || '', 'ca');
    })
);

async function assignarRol(usuari, nouRol, dept = null) {
  error.value = '';
  try {
    await updateDoc(doc(db, 'usuaris', usuari.id), {
      rol: nouRol,
      departament: dept || null,
      updatedAt: new Date(),
    });
  } catch (err) {
    error.value = 'Error assignant rol: ' + err.message;
  }
}

function assignarRolDept(usuari) {
  const dept = deptPendent.value[usuari.id];
  if (!dept) {
    error.value = 'Selecciona un departament primer.';
    return;
  }
  error.value = '';
  assignarRol(usuari, 'cap_departament', dept);
}

async function canviarRol(usuari, nouRol) {
  error.value = '';
  try {
    await updateDoc(doc(db, 'usuaris', usuari.id), {
      rol: nouRol,
      departament: nouRol === 'admin' ? null : (usuari.departament || null),
      updatedAt: new Date(),
    });
  } catch (err) {
    error.value = 'Error canviant rol: ' + err.message;
  }
}

async function canviarDepartament(usuari, nouDept) {
  error.value = '';
  try {
    await updateDoc(doc(db, 'usuaris', usuari.id), {
      departament: nouDept || null,
      updatedAt: new Date(),
    });
  } catch (err) {
    error.value = 'Error canviant departament: ' + err.message;
  }
}

async function eliminarUsuari(usuari) {
  error.value = '';
  try {
    await deleteDoc(doc(db, 'usuaris', usuari.id));
  } catch (err) {
    error.value = 'Error eliminant usuari: ' + err.message;
  }
}
</script>
