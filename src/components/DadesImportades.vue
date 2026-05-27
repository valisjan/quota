<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div class="border-l-4 border-[#0024B6] px-5 py-4 dark:border-[#B7C5FF]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-500">
            Font de veritat: Google Sheets
          </p>
          <h2 class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Dades importades</h2>
          <p class="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Consulta de les dades que venen del full de càlcul. Els canvis estructurals es fan a Google Sheets i després se sincronitzen.
          </p>
        </div>
        <router-link
          to="/admin/sincronitzacio"
          class="inline-flex items-center justify-center rounded-lg bg-[#0024B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001A8A] dark:bg-[#3355CC] dark:hover:bg-[#0024B6]"
        >
          Sincronització
        </router-link>
      </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div
        v-for="item in resumDades"
        :key="item.label"
        class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800"
      >
        <div class="text-2xl font-semibold text-slate-950 dark:text-white">{{ item.value }}</div>
        <div class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ item.label }}</div>
        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.detail }}</div>
      </div>
    </section>

    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <nav class="flex flex-wrap gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="activa = tab.id"
          class="rounded-md px-4 py-2.5 text-sm font-semibold transition"
          :class="activa === tab.id
            ? 'bg-[#0024B6] text-white dark:bg-[#3355CC]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-gray-700 dark:hover:text-white'"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <section v-if="activa === 'classes'" class="space-y-4">
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-950 dark:text-white">Classes</h3>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Carrega només el que necessites revisar.
            </p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-700" @click="netejarFiltresClasses">
            Neteja filtres
          </button>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Cerca
            <input
              v-model="filtresClasses.general"
              type="text"
              class="form-input mt-1 w-full"
              placeholder="Matèria, curs, grup..."
            />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Departament
            <select v-model="filtresClasses.departament" class="form-input mt-1 w-full">
              <option value="">Tots</option>
              <option v-for="dep in departamentsOrdenats" :key="dep.id" :value="dep.nom">
                {{ dep.nom }}
              </option>
            </select>
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Curs
            <input
              v-model.trim="filtresClasses.curs"
              type="text"
              class="form-input mt-1 w-full"
              placeholder="1ESO"
            />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Tipus
            <select v-model="filtresClasses.tipus" class="form-input mt-1 w-full">
              <option value="">Tots</option>
              <option value="normal">Normal</option>
              <option value="O">Optativa</option>
              <option value="T">Optativa compartida</option>
              <option value="D">Desdoblament</option>
              <option value="S">Suport</option>
              <option value="F">Flexible</option>
              <option value="C">Coordinació</option>
              <option value="GP">Guàrdia de pati</option>
              <option value="PALIC">PALIC</option>
            </select>
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Professor
            <select v-model="filtresClasses.professor" class="form-input mt-1 w-full">
              <option value="">Tots</option>
              <option value="sense-assignar">Sense assignar</option>
              <option v-for="prof in professorsOrdenats" :key="prof.id" :value="prof.nom">
                {{ prof.nom }}
              </option>
            </select>
          </label>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            <span v-if="teFiltreEstructurat">
              {{ classesFiltrades.length }} classes carregades amb el filtre actual.
            </span>
            <span v-else>
              Tria departament, curs, tipus o professor per carregar classes.
            </span>
          </p>
        </div>
      </div>

      <div v-if="carregantClasses" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-gray-800">
        Carregant classes...
      </div>

      <div v-else-if="!teFiltreEstructurat" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-gray-900">
        <p class="font-semibold text-slate-900 dark:text-white">Aplica un filtre per veure classes.</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Així evitem carregar tota la quota cada vegada.
        </p>
      </div>

      <div v-else-if="classesFiltrades.length === 0" class="rounded-lg border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-gray-800">
        <p class="font-semibold text-slate-900 dark:text-white">No hi ha classes amb aquest filtre.</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Canvia el filtre o comprova la sincronització.</p>
      </div>

      <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" style="min-width: 900px">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-gray-700 dark:text-slate-300">
              <tr>
                <th class="px-4 py-3">Curs</th>
                <th class="px-4 py-3">Grup</th>
                <th class="px-4 py-3">Matèria</th>
                <th class="px-4 py-3 text-center">Hores</th>
                <th class="px-4 py-3">Tipus</th>
                <th class="px-4 py-3">Departament</th>
                <th class="px-4 py-3">Professors</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="classe in classesFiltrades" :key="classe.id" class="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ classe.curs || '-' }}</td>
                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ classe.grup || '-' }}</td>
                <td class="px-4 py-3 text-slate-900 dark:text-white">{{ classe.materia || '-' }}</td>
                <td class="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">{{ classe.hores || 0 }}</td>
                <td class="px-4 py-3">
                  <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-gray-700 dark:text-slate-200">
                    {{ etiquetaTipus(classe.tipus) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ departamentClasse(classe) || '-' }}</td>
                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">
                  <span v-if="professorsClasse(classe).length">
                    {{ professorsClasse(classe).join(', ') }}
                  </span>
                  <span v-else class="text-red-600 dark:text-red-400">Sense assignar</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else-if="activa === 'professors'" class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Professorat</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ professorsOrdenats.length }} professors importats.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width: 720px">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-gray-700 dark:text-slate-300">
            <tr>
              <th class="px-4 py-3">Nom</th>
              <th class="px-4 py-3">Departament</th>
              <th class="px-4 py-3">Jornada</th>
              <th class="px-4 py-3">Preferència</th>
              <th class="px-4 py-3">Motiu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="professor in professorsOrdenats" :key="professor.id" class="hover:bg-slate-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ professor.nom }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ professor.departament || '-' }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ etiquetaJornada(professor.jornada) }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ etiquetaPreferencia(professor.preferencia) }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ professor.motiuAllegat || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Departaments</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Es deriven del professorat importat.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-gray-700 dark:text-slate-300">
            <tr>
              <th class="px-4 py-3">Departament</th>
              <th class="px-4 py-3 text-center">Professors</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="dep in departamentsAmbProfessors" :key="dep.nom" class="hover:bg-slate-50 dark:hover:bg-gray-700/50">
              <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ dep.nom }}</td>
              <td class="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{{ dep.professors }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { getDocs, query, where } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { professorsClasse } from '../utils/horesProfessor';

const tabs = [
  { id: 'classes', label: 'Classes' },
  { id: 'professors', label: 'Professorat' },
  { id: 'departaments', label: 'Departaments' },
];

const activa = ref('classes');
const cursStore = useCursStore();
const classes = ref([]);
const professors = ref([]);
const departaments = ref([]);
const carregantClasses = ref(false);
const error = ref('');

const filtresClasses = reactive({
  general: '',
  departament: '',
  curs: '',
  tipus: '',
  professor: '',
});

const teFiltreEstructurat = computed(() =>
  Boolean(
    filtresClasses.departament ||
      filtresClasses.curs ||
      filtresClasses.tipus ||
      filtresClasses.professor
  )
);

const clauFiltresClasses = computed(() =>
  [
    filtresClasses.departament,
    filtresClasses.curs,
    filtresClasses.tipus,
    filtresClasses.professor,
  ].join('|')
);

const departamentsOrdenats = computed(() =>
  [...departaments.value].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'ca'))
);

const professorsOrdenats = computed(() =>
  [...professors.value].sort(
    (a, b) =>
      (a.departament || '').localeCompare(b.departament || '', 'ca') ||
      (a.nom || '').localeCompare(b.nom || '', 'ca')
  )
);

const classesFiltrades = computed(() => {
  const terme = normalitzar(filtresClasses.general);
  return [...classes.value]
    .filter((classe) => {
      if (!terme) return true;
      return normalitzar([
        classe.curs,
        classe.grup,
        classe.materia,
        departamentClasse(classe),
        professorsClasse(classe).join(' '),
      ].join(' ')).includes(terme);
    })
    .filter((classe) => {
      if (filtresClasses.departament && departamentClasse(classe) !== filtresClasses.departament) return false;
      if (filtresClasses.curs && classe.curs !== filtresClasses.curs) return false;
      if (filtresClasses.tipus === 'normal' && (classe.tipus || '').toString().trim()) return false;
      if (filtresClasses.tipus && filtresClasses.tipus !== 'normal') {
        const tipus = (classe.tipus || '').toString().toUpperCase().trim();
        if (!tipus.startsWith(filtresClasses.tipus)) return false;
      }
      if (filtresClasses.professor === 'sense-assignar' && professorsClasse(classe).length) return false;
      if (
        filtresClasses.professor &&
        filtresClasses.professor !== 'sense-assignar' &&
        !professorsClasse(classe).includes(filtresClasses.professor)
      ) return false;
      return true;
    })
    .sort(ordenarClasses);
});

const departamentsAmbProfessors = computed(() => {
  const recompte = new Map();
  professors.value.forEach((professor) => {
    const nom = professor.departament || 'Sense departament';
    recompte.set(nom, (recompte.get(nom) || 0) + 1);
  });

  departaments.value.forEach((dep) => {
    if (!recompte.has(dep.nom)) recompte.set(dep.nom, 0);
  });

  return [...recompte.entries()]
    .map(([nom, total]) => ({ nom, professors: total }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
});

const resumDades = computed(() => [
  {
    label: 'Professorat',
    value: professors.value.length,
    detail: 'registres importats',
  },
  {
    label: 'Departaments',
    value: departamentsAmbProfessors.value.length,
    detail: 'derivats del professorat',
  },
  {
    label: 'Classes visibles',
    value: teFiltreEstructurat.value ? classesFiltrades.value.length : '-',
    detail: teFiltreEstructurat.value ? 'amb el filtre actual' : 'aplica un filtre',
  },
]);

watch(() => cursStore.cursActiuId, async () => {
  await Promise.all([carregarProfessorat(), carregarDepartaments()]);
  await carregarClasses();
}, { immediate: true });

watch(clauFiltresClasses, carregarClasses);

async function carregarProfessorat() {
  try {
    const snapshot = await getDocs(cursStore.col('professors'));
    professors.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
  } catch (err) {
    console.error('Error carregant professorat:', err);
    error.value = 'No s\'ha pogut carregar el professorat.';
  }
}

async function carregarDepartaments() {
  try {
    const snapshot = await getDocs(cursStore.col('departaments'));
    departaments.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
  } catch (err) {
    console.error('Error carregant departaments:', err);
    error.value = 'No s\'han pogut carregar els departaments.';
  }
}

async function carregarClasses() {
  error.value = '';
  if (!teFiltreEstructurat.value) {
    classes.value = [];
    return;
  }

  carregantClasses.value = true;
  try {
    const constraints = [];
    if (filtresClasses.professor && filtresClasses.professor !== 'sense-assignar') {
      constraints.push(where('professors', 'array-contains', filtresClasses.professor));
    } else if (filtresClasses.professor === 'sense-assignar') {
      constraints.push(where('professorAssignat', '==', ''));
    } else if (filtresClasses.departament) {
      constraints.push(where('departaments', 'array-contains', filtresClasses.departament));
    } else if (filtresClasses.curs) {
      constraints.push(where('curs', '==', filtresClasses.curs));
    } else if (filtresClasses.tipus === 'normal') {
      constraints.push(where('tipus', '==', ''));
    } else if (filtresClasses.tipus === 'O' || filtresClasses.tipus === 'T') {
      constraints.push(where('tipus', '>=', filtresClasses.tipus));
      constraints.push(where('tipus', '<', String.fromCharCode(filtresClasses.tipus.charCodeAt(0) + 1)));
    } else if (filtresClasses.tipus) {
      constraints.push(where('tipus', '==', filtresClasses.tipus));
    }

    const snapshot = await getDocs(query(cursStore.col('classes'), ...constraints));
    classes.value = snapshot.docs.map((docu) => {
      const data = docu.data();
      return {
        id: docu.id,
        ...data,
        departaments: data.departaments || [data.departament].filter(Boolean),
        professors: data.professors || [data.professorAssignat].filter(Boolean),
      };
    });
  } catch (err) {
    console.error('Error carregant classes:', err);
    error.value = 'No s\'han pogut carregar les classes amb aquest filtre.';
  } finally {
    carregantClasses.value = false;
  }
}

function netejarFiltresClasses() {
  filtresClasses.general = '';
  filtresClasses.departament = '';
  filtresClasses.curs = '';
  filtresClasses.tipus = '';
  filtresClasses.professor = '';
}

function departamentClasse(classe) {
  return classe.departaments?.[0] || classe.departament || '';
}

function etiquetaTipus(tipus) {
  const normal = (tipus || '').toString().toUpperCase().trim();
  if (!normal) return 'Normal';
  if (normal.startsWith('T')) return `Optativa compartida ${normal}`;
  if (normal.startsWith('O')) return `Optativa ${normal}`;
  const map = {
    D: 'Desdoblament',
    S: 'Suport',
    F: 'Flexible',
    C: 'Coordinació',
    GP: 'Guàrdia de pati',
    PALIC: 'PALIC',
  };
  return map[normal] || normal;
}

function etiquetaJornada(jornada) {
  if (jornada === 'M') return 'Mitja jornada';
  if (jornada === 'T') return "Reducció d'1/3";
  return 'Completa';
}

function etiquetaPreferencia(preferencia) {
  if (preferencia === 'pronto') return 'Entrar prest';
  if (preferencia === 'tarde') return 'Entrar tard';
  return '-';
}

function normalitzar(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function ordenarClasses(a, b) {
  return (
    (a.curs || '').localeCompare(b.curs || '', 'ca') ||
    (a.grup || '').localeCompare(b.grup || '', 'ca') ||
    (a.materia || '').localeCompare(b.materia || '', 'ca')
  );
}
</script>
