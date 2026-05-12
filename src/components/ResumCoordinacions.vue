<template>
  <div class="space-y-8">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
          :class="
            isConnected
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
          "
        >
          <div
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
        </div>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Última actualització: {{ lastUpdate }}
      </div>
    </div>

    <section
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              Coordinacions i comissions
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Registres importats amb tipus C.
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ totalHoresCoordinacions }}h
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ coordinacions.length }} registres
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="coordinacions.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400 italic"
      >
        No hi ha coordinacions importades amb tipus C.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Comissió</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Hores coordinació</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Coordinador</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Membres</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="classe in coordinacions"
              :key="classe.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
                {{ classe.materia }}
              </td>
              <td class="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                {{ classe.hores }}h
              </td>
              <td class="px-6 py-3">
                <span v-if="classe.professorAssignat" class="text-gray-700 dark:text-gray-300">
                  {{ classe.professorAssignat }}
                </span>
                <span v-else class="text-red-600 dark:text-red-400 font-medium">
                  Sense coordinador
                </span>
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                <div v-if="membresCoordinacio(classe).length" class="space-y-1">
                  <div
                    v-for="membre in membresCoordinacio(classe)"
                    :key="membre"
                  >
                    {{ membre }}
                  </div>
                </div>
                <span v-else class="italic text-gray-400 dark:text-gray-500">
                  Sense membres
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              Altres hores sense assignació clara
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Registres importats que no semblen classe ordinària, coordinació, GP ni PALIC.
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ totalHoresAltres }}h
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ altresHores.length }} registres
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="altresHores.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400 italic"
      >
        No hi ha altres hores pendents de classificar.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Departament</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Matèria</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Tipus</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Curs / Grup</th>
              <th class="text-center px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Hores</th>
              <th class="text-left px-6 py-3 font-medium text-gray-700 dark:text-gray-300">Motiu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="classe in altresHores"
              :key="classe.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                {{ classe.departament || classe.departaments?.[0] || 'Sense departament' }}
              </td>
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
                {{ classe.materia || 'Sense matèria' }}
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                {{ classe.tipus || 'Buit' }}
              </td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-300">
                <span v-if="classe.curs || classe.grup">{{ classe.curs }} {{ classe.grup }}</span>
                <span v-else class="italic text-gray-400 dark:text-gray-500">Sense grup</span>
              </td>
              <td class="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                {{ classe.hores }}h
              </td>
              <td class="px-6 py-3 text-red-600 dark:text-red-400">
                {{ motiuAltresHores(classe) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useColSnapshot } from '../composables/useColSnapshot';

const { items: classes, isConnected, lastUpdate } = useColSnapshot('classes');

const TIPUS_CONEGUTS_SENSE_GRUP = ['C', 'GP', 'PALIC'];
const TIPUS_CONEGUTS_AMB_GRUP = ['D', 'S', 'F', 'A'];

function normalitzarTipus(tipus) {
  return (tipus || '').toString().trim().toUpperCase();
}

function normalitzarText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\*/, '')
    .trim()
    .toLowerCase();
}

function esOptativa(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal.startsWith('O') || normal.startsWith('T');
}

function esTutoria(classe) {
  return normalitzarText(classe.materia).includes('tutoria');
}

function esCapDepartament(classe) {
  const materia = normalitzarText(classe.materia);
  return materia.includes('cap') && materia.includes('departament');
}

function teGrupClasse(classe) {
  return Boolean(
    (classe.curs || '').toString().trim() &&
      (classe.grup || '').toString().trim()
  );
}

function teDepartament(classe) {
  return Boolean(
    (classe.departament || '').toString().trim() || classe.departaments?.[0]
  );
}


const coordinacions = computed(() => {
  return classes.value
    .filter((classe) => normalitzarTipus(classe.tipus) === 'C')
    .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));
});

const altresHores = computed(() => {
  return classes.value
    .filter((classe) => {
      const tipus = normalitzarTipus(classe.tipus);

      if (tipus === 'C') return false;
      if (esTutoria(classe)) return false;
      if (esCapDepartament(classe)) return false;
      if (!teDepartament(classe)) return true;
      if (!classe.materia || classe.hores <= 0) return true;
      if (!teGrupClasse(classe)) {
        return !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus);
      }
      if (!tipus || esOptativa(tipus)) return false;
      if (TIPUS_CONEGUTS_AMB_GRUP.includes(tipus)) return false;
      return !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus);
    })
    .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));
});

const totalHoresCoordinacions = computed(() => sumarHores(coordinacions.value));
const totalHoresAltres = computed(() => sumarHores(altresHores.value));

function sumarHores(llista) {
  return llista.reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
}

function membresCoordinacio(classe) {
  return (classe.participants || []).filter(
    (nom) => nom && nom !== classe.professorAssignat
  );
}

function motiuAltresHores(classe) {
  const tipus = normalitzarTipus(classe.tipus);
  if (!teDepartament(classe)) return 'Falta departament';
  if (!classe.materia) return 'Falta matèria';
  if (!classe.hores || classe.hores <= 0) return 'Hores buides o zero';
  if (!teGrupClasse(classe) && !TIPUS_CONEGUTS_SENSE_GRUP.includes(tipus)) {
    return 'Sense curs/grup i tipus no classificat';
  }
  return `Tipus no classificat: ${classe.tipus || 'buit'}`;
}

</script>
