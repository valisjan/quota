<template>
  <div class="min-h-screen p-2 sm:p-4">
    <div class="container mx-auto">
    <!-- Selector de departamento -->
    <DepartamentSelector
      v-model="departamentSeleccionat"
      :departaments="departamentsSorted"
    />

    <div v-if="!departamentSeleccionat" class="text-center py-12">
      <p class="text-xl text-gray-600 dark:text-gray-400">
        Selecciona un departament per veure la informació
      </p>
    </div>

    <div v-else>
      <div
        v-if="departamentTancat"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-slate-800"
      >
        Aquest departament està tancat. El repartiment es pot consultar, però no modificar.
        <span v-if="settings.missatgeTancament" class="ml-1 font-normal">{{ settings.missatgeTancament }}</span>
      </div>

      <div
        v-if="errorMsg"
        class="mb-4 flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
      >
        {{ errorMsg }}
        <button type="button" class="ml-3 font-semibold hover:underline" @click="errorMsg = null">x</button>
      </div>

      <!-- Indicador de connexió -->
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <div
            class="flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
            :class="
              isConnected
                ? 'border-slate-200 bg-white text-slate-700'
                : 'border-red-200 bg-red-50 text-slate-700'
            "
          >
            <div
              class="w-2 h-2 rounded-sm"
              :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
          </div>
          <div
            v-if="usuarisActius.length > 0"
            class="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
          >
            Connectats: {{ usuarisActius.join(', ') }}
          </div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Última actualització: {{ lastUpdate }}
        </div>
      </div>

      <div
        v-if="!departamentTancat && !solsLectura"
        class="mb-4 flex justify-end"
      >
        <button
          type="button"
          class="rounded-md bg-[#FF8040] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#CC5020] transition"
          @click="tancarDepartament"
        >
          Tancar aquest departament
        </button>
      </div>

      <!-- Pestanyes -->
      <div class="mb-5 flex gap-1 border border-slate-200 bg-white p-1" role="tablist" aria-label="Seccions del departament">
        <button
          id="tab-repartiment"
          role="tab"
          :aria-selected="activeTab === 'repartiment'"
          aria-controls="panel-repartiment"
          @click="activeTab = 'repartiment'"
          class="flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-all"
          :class="activeTab === 'repartiment'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'"
        >
          Repartiment
        </button>
        <button
          id="tab-fulla"
          role="tab"
          :aria-selected="activeTab === 'fulla'"
          aria-controls="panel-fulla"
          @click="activeTab = 'fulla'"
          class="flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-all"
          :class="activeTab === 'fulla'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'"
        >
          Full de treball
        </button>
        <button
          id="tab-aleatori"
          role="tab"
          :aria-selected="activeTab === 'aleatori'"
          aria-controls="panel-aleatori"
          @click="activeTab = 'aleatori'"
          class="flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-all"
          :class="activeTab === 'aleatori'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'"
        >
          Proposta
        </button>
      </div>

      <!-- Pestanya: Repartiment -->
      <div v-show="activeTab === 'repartiment'" id="panel-repartiment" role="tabpanel" aria-labelledby="tab-repartiment">
        <!-- Resum GP, PALIC i hores del departament -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="rounded-lg border border-slate-200 border-l-4 border-l-[#0024B6] bg-white p-3 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-900">Hores lectives</h3>
                <p class="text-xs text-slate-500 dark:text-gray-400">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-semibold text-slate-950">
                  {{ totalHoresAssignades }}
                </span>
                <span class="text-slate-400"> / {{ totalHoresDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalHoresAssignades === totalHoresDepartament ? 'bg-[#00BF33]' : 'bg-[#FF8040]'"
                :style="`width: ${totalHoresDepartament > 0 ? Math.min(100,(totalHoresAssignades/totalHoresDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div v-if="totalGPDepartament > 0" class="rounded-lg border border-slate-200 border-l-4 border-l-[#00BF33] bg-white p-3 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-900">Guàrdies de pati</h3>
                <p class="text-xs text-slate-500 dark:text-gray-400">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-semibold text-slate-950">
                  {{ totalGPAssignades }}
                </span>
                <span class="text-slate-400"> / {{ totalGPDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalGPAssignades === totalGPDepartament ? 'bg-[#00BF33]' : 'bg-[#FF8040]'"
                :style="`width: ${totalGPDepartament > 0 ? Math.min(100,(totalGPAssignades/totalGPDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div v-if="totalPALICDepartament > 0" class="rounded-lg border border-slate-200 border-l-4 border-l-[#FF8040] bg-white p-3 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-900">PALIC</h3>
                <p class="text-xs text-slate-500 dark:text-gray-400">Hores assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-semibold text-slate-950">
                  {{ totalPALICAssignades }}
                </span>
                <span class="text-slate-400"> / {{ totalPALICDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalPALICAssignades === totalPALICDepartament ? 'bg-[#00BF33]' : 'bg-[#FF8040]'"
                :style="`width: ${totalPALICDepartament > 0 ? Math.min(100,(totalPALICAssignades/totalPALICDepartament)*100) : 0}%`"
              />
            </div>
          </div>
        </div>

        <!-- Resum del departament col·lapsable -->
        <div class="mb-6">
          <button
            @click="mostrarResumen = !mostrarResumen"
            class="mb-2 flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <h3 class="text-base font-semibold text-slate-950">Resum del departament</h3>
            <span class="text-sm font-medium text-slate-500">{{ mostrarResumen ? 'Amaga' : 'Mostra' }}</span>
          </button>
          <div v-show="mostrarResumen">
            <DepartamentResumen
              :departament="departamentSeleccionat"
              :classes="classesDepartament"
              :total-hores="totalHoresDepartament"
              :professors-necessaris="formatProfessorsNecessaris()"
              @imprimir="imprimirDepartament"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
          <div class="lg:sticky lg:top-4">
            <RepartimentHores
              :departamentSeleccionat="departamentSeleccionat"
              :bloquejat="departamentTancat || solsLectura"
              @assignacionsActualitzades="handleAssignacionsActualitzades"
            />
          </div>
          <div>
            <div class="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <h3 class="text-base font-semibold text-slate-950">Professorat</h3>
              <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700">{{ professorsDepartament.length }}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              <ProfessorCard
                v-for="professor in professorsDepartament"
                :key="professor.id"
                :professor="professor"
                :classes="getClassesProfessor(professor.nom)"
                :hores-lectives="calcularHoresProfessor(professor.nom)"
                :hores-gp="getHoresGP(professor.nom)"
                :hores-palic="getHoresPALIC(professor.nom)"
                :mostra-gp="totalGPDepartament > 0 || totalGPAssignades > 0"
                :total-gp-departament="totalGPDepartament"
                :total-gp-assignades="totalGPAssignades"
                :total-palic-departament="totalPALICDepartament"
                :total-palic-assignades="totalPALICAssignades"
                :coordinacions="coordinacions"
                :bloquejat="departamentTancat || solsLectura"
                @actualitzar-professor="actualitzarProfessor"
                @incrementar-gp="incrementarGP"
                @decrementar-gp="decrementarGP"
                @incrementar-palic="incrementarPALIC"
                @decrementar-palic="decrementarPALIC"
                @toggle-coordinacio="toggleCoordinacioProfessor"
                @desassignar-classe="desassignarClasseProfessor"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Pestanya: Proposta aleatòria -->
      <div v-show="activeTab === 'aleatori'" id="panel-aleatori" role="tabpanel" aria-labelledby="tab-aleatori">
        <DepartamentAleatori
          :professors="professorsDepartament"
          :classes="classesDepartament"
        />
      </div>

      <!-- Pestanya: Full de treball -->
      <div v-show="activeTab === 'fulla'" id="panel-fulla" role="tabpanel" aria-labelledby="tab-fulla">
        <DepartamentFulla
          :departament="departamentSeleccionat"
          :professors="professorsDepartament"
          :classes="classesDepartament"
          :total-hores-assignades="totalHoresAssignades"
          :total-hores-departament="totalHoresDepartament"
          :total-gp-departament="totalGPDepartament"
          :total-gp-assignades="totalGPAssignades"
          :total-palic-departament="totalPALICDepartament"
          :total-palic-assignades="totalPALICAssignades"
          :get-classes-professor="getClassesProfessor"
          :calcular-hores-professor="calcularHoresProfessor"
          :get-hores-gp="getHoresGP"
          :get-hores-palic="getHoresPALIC"
        />
      </div>
    </div>

    <!-- Modal de impresión -->
    <DepartamentPrintModal
      :departament="departamentSeleccionat"
      :professors="professorsDepartament"
      :classes="classesDepartament"
      :total-hores="totalHoresDepartament"
      :professors-necessaris="formatProfessorsNecessaris()"
      :total-gp="totalGPDepartament"
      :total-gp-assignades="totalGPAssignades"
      :total-palic="totalPALICDepartament"
      :total-palic-assignades="totalPALICAssignades"
      :get-classes-professor="getClassesProfessor"
      :calcular-hores-professor="calcularHoresProfessor"
      :get-hores-gp="getHoresGP"
      :get-hores-palic="getHoresPALIC"
      :is-perfect-hours="isPerfectHours"
      :is-over-recommended="isOverRecommended"
      :is-over-limit="isOverLimit"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { db } from '../firebase';
import {
  collection,
  doc,
  writeBatch,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import RepartimentHores from '../components/RepartimentHores.vue';
import DepartamentSelector from '../components/departament/DepartamentSelector.vue';
import DepartamentResumen from '../components/departament/DepartamentResumen.vue';
import DepartamentFulla from '../components/departament/DepartamentFulla.vue';
import DepartamentAleatori from '../components/departament/DepartamentAleatori.vue';
import ProfessorCard from '../components/departament/ProfessorCard.vue';
import DepartamentPrintModal from '../components/departament/DepartamentPrintModal.vue';
import { limitsHoresProfessor, professorsClasse, classeAssignadaA, horesComputablesClasse, calcularHoresLectives } from '../utils/horesProfessor';
import { esTutoriaPrincipal, esTutoriaAsterisc, trobarTutoriaAsterisc, trobarTutoriaPrincipal, trobarAssignaturesParelladesTutoria, esCapsEstudisClasse, trobarDedicacioPerCapEstudis } from '../utils/tutories';
import { esGP, esPALIC, esOptativaCompartida, esCoordinacioAmbMembres, exclosaDelRepartiment } from '../utils/tipus';
import { trobarGermanesBloc } from '../utils/grups';
import { quotaGuardiesPatiDepartament } from '../utils/guardiesPati';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';

const departamentSeleccionat = ref('');
const authStore = useAuthStore();
const cursStore = useCursStore();
const toast = useToastStore();
const solsLectura = computed(() => authStore.rol === 'professor');
const departaments = ref([]);
const classes = ref([]);
const professors = ref([]);
const errorMsg = ref(null);
const isConnected = ref(true);
const activeUsers = ref(1);
const usuarisActius = ref([]);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
const mostrarResumen = ref(false); // col·lapsat per defecte
const activeTab = ref('repartiment');
const settings = ref({ ...DEFAULT_APP_SETTINGS });
const totalGuardiesPatiConfigurades = computed(() =>
  Math.max(0, Math.round(Number(settings.value.totalGuardiesPati ?? 30) || 0))
);
const totalHoresAssignades = computed(() => {
  return classesDepartament.value
    .filter((c) => !exclosaDelRepartiment(c.tipus))
    .reduce((total, c) => total + horesAssignadesClasse(c), 0);
});

let classesUnsubscribe = null;
let professorsUnsubscribe = null;
let departamentsUnsubscribe = null;
let presenceUnsubscribe = null;
let settingsUnsubscribe = null;
let presenceInterval = null;

const sessionId = ref(
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
);

// Computed

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

const professorsDepartament = computed(() => {
  return professors.value
    .filter((p) => p.departament === departamentSeleccionat.value)
    .sort((a, b) => a.nom.localeCompare(b.nom));
});

const classesDepartament = computed(() => {
  return classes.value
    .filter((c) => c.departaments?.includes(departamentSeleccionat.value))
    .sort((a, b) => {
      if (!a.curs && !b.curs) return 0;
      if (!a.curs) return 1;
      if (!b.curs) return -1;
      if (a.curs !== b.curs) return a.curs.localeCompare(b.curs);
      if (!a.grup && !b.grup) return 0;
      if (!a.grup) return 1;
      if (!b.grup) return -1;
      if (a.grup !== b.grup) return a.grup.localeCompare(b.grup);
      return a.materia.localeCompare(b.materia);
    });
});

const totalHoresDepartament = computed(() => {
  return classesDepartament.value
    .filter((c) => !exclosaDelRepartiment(c.tipus))
    .reduce((total, c) => total + c.hores, 0);
});

// GP: quota calculada proporcionalment al nombre de professors del curs.
const totalGPDepartament = computed(() => {
  return quotaGuardiesPatiDepartament(
    professors.value,
    departamentSeleccionat.value,
    totalGuardiesPatiConfigurades.value
  );
});

// GP assignades: suma del camp gpAssignades de cada professor.
const totalGPAssignades = computed(() => {
  return professorsDepartament.value.reduce(
    (total, p) => total + (p.gpAssignades || 0),
    0
  );
});

// PALIC: pool total del departament.
const totalPALICDepartament = computed(() => {
  return classes.value
    .filter(
      (c) =>
        esPALIC(c.tipus) &&
        c.departaments?.[0] === departamentSeleccionat.value &&
        (!c.curs || c.curs === '') &&
        (!c.grup || c.grup === '')
    )
    .reduce((total, c) => total + c.hores, 0);
});

// PALIC assignades: suma del camp palicAssignades de cada professor.
const totalPALICAssignades = computed(() => {
  return professorsDepartament.value.reduce(
    (total, p) => total + (p.palicAssignades || 0),
    0
  );
});

const coordinacions = computed(() => {
  return classes.value
    .filter((c) => esCoordinacioAmbMembres(c.tipus))
    .sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));
});

const departamentActual = computed(() =>
  departaments.value.find((dep) => dep.nom === departamentSeleccionat.value) || null
);

const departamentTancat = computed(() => Boolean(departamentActual.value?.tancat));

// Funcions

function updateLastUpdate() {
  lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatProfessorsNecessaris() {
  const totalHores = totalHoresDepartament.value;
  const exactProfessors = totalHores / 18;
  return (Math.round(exactProfessors * 10) / 10).toString();
}

function esOptativaCompartidaClasse(classe) {
  return esOptativaCompartida(classe.tipus);
}

function horesAssignadesClasse(classe) {
  const assignats = professorsClasse(classe).length;
  if (!assignats) return 0;
  if (esOptativaCompartidaClasse(classe)) {
    return ((Number(classe.hores) || 0) / 2) * Math.min(assignats, 2);
  }
  return Number(classe.hores) || 0;
}

function getClassesProfessor(nomProfessor) {
  return classes.value
    .filter((c) => classeAssignadaA(c, nomProfessor) && !esGP(c.tipus) && !esPALIC(c.tipus))
    .sort((a, b) => {
      if (a.curs !== b.curs) return (a.curs || '').localeCompare(b.curs || '');
      if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
      return (a.grup || '').localeCompare(b.grup || '');
    });
}

function calcularHoresProfessor(nomProfessor) {
  return calcularHoresLectives(classes.value, nomProfessor);
}

const professorsMap = computed(() => new Map(professors.value.map((p) => [p.nom, p])));

function getProfessor(nomProfessor) {
  return professorsMap.value.get(nomProfessor) || {};
}

function getHoresGP(nomProfessor) {
  return getProfessor(nomProfessor).gpAssignades || 0;
}

function getHoresPALIC(nomProfessor) {
  return getProfessor(nomProfessor).palicAssignades || 0;
}

function calcularHoresComputablesProfessor(nomProfessor) {
  return calcularHoresProfessor(nomProfessor) + getHoresPALIC(nomProfessor);
}

function isPerfectHours(nomProfessor) {
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  return calcularHoresComputablesProfessor(nomProfessor) === limits.ideal;
}

function isOverRecommended(nomProfessor) {
  const h = calcularHoresComputablesProfessor(nomProfessor);
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  return h > limits.ideal && h <= limits.maxim;
}

function isOverLimit(nomProfessor) {
  const limits = limitsHoresProfessor(getProfessor(nomProfessor));
  return calcularHoresComputablesProfessor(nomProfessor) > limits.maxim;
}

// GP

async function incrementarGP(professor) {
  if (departamentTancat.value) return;
  if (totalGPAssignades.value >= totalGPDepartament.value) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      gpAssignades: (professor.gpAssignades || 0) + 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error incrementant GP:', e);
    toast.error("No s'ha pogut guardar la guàrdia de pati: " + (e.message || e.code || ''));
  }
}

async function decrementarGP(professor) {
  if (departamentTancat.value) return;
  if (!professor.gpAssignades || professor.gpAssignades <= 0) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      gpAssignades: professor.gpAssignades - 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error decrementant GP:', e);
    toast.error("No s'ha pogut guardar la guàrdia de pati: " + (e.message || e.code || ''));
  }
}

// PALIC

async function incrementarPALIC(professor) {
  if (departamentTancat.value) return;
  if (totalPALICAssignades.value >= totalPALICDepartament.value) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      palicAssignades: (professor.palicAssignades || 0) + 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error incrementant PALIC:', e);
  }
}

async function decrementarPALIC(professor) {
  if (departamentTancat.value) return;
  if (!professor.palicAssignades || professor.palicAssignades <= 0) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      palicAssignades: professor.palicAssignades - 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error decrementant PALIC:', e);
  }
}

// Professor

async function actualitzarProfessor(professor) {
  if (departamentTancat.value) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      preferencia: professor.preferencia || '',
      motiuAllegat: professor.motiuAllegat || '',
      comentaris: professor.comentaris || '',
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error actualitzant professor:', e);
  }
}

async function toggleCoordinacioProfessor({ professor, coordinacio, participa }) {
  if (departamentTancat.value) return;
  try {
    if (coordinacio.professorAssignat === professor.nom) return;

    const participantsActuals = (coordinacio.participants || []).filter(
      (nom) => nom !== coordinacio.professorAssignat
    );
    const participants = participa
      ? [...new Set([...participantsActuals, professor.nom])]
      : participantsActuals.filter((nom) => nom !== professor.nom);

    await updateDoc(cursStore.docRef('classes', coordinacio.id), {
      participants,
      lastModified: serverTimestamp(),
    });
    updateLastUpdate();
  } catch (e) {
    console.error('Error actualitzant participants de coordinació:', e);
  }
}

async function desassignarClasseProfessor({ professor, classe }) {
  if (departamentTancat.value) return;
  try {
    const professorsActuals = (classe.professors || []).filter(
      (nom) => nom && nom !== professor.nom
    );

    const classesPerActualitzar = [classe];

    // Resolve the main tutoria regardless of whether classe is the principal or the *Tutoria
    const tutoriaPrincipal = esTutoriaPrincipal(classe)
      ? classe
      : esTutoriaAsterisc(classe)
        ? trobarTutoriaPrincipal(classe, classes.value)
        : null;

    if (tutoriaPrincipal) {
      // Always keep principal and *Tutoria in sync
      if (tutoriaPrincipal !== classe && !classesPerActualitzar.some((c) => c.id === tutoriaPrincipal.id)) {
        classesPerActualitzar.push(tutoriaPrincipal);
      }
      const tutoriaAsterisc = trobarTutoriaAsterisc(tutoriaPrincipal, classes.value);
      if (tutoriaAsterisc && !classesPerActualitzar.some((c) => c.id === tutoriaAsterisc.id)) {
        classesPerActualitzar.push(tutoriaAsterisc);
      }
      // Also sync paired subject
      for (const assignatura of trobarAssignaturesParelladesTutoria(tutoriaPrincipal, classes.value)) {
        if (!classesPerActualitzar.some((c) => c.id === assignatura.id)) {
          classesPerActualitzar.push(assignatura);
        }
      }
    }

    for (const germana of trobarGermanesBloc(classe, classes.value)) {
      if (!classesPerActualitzar.some((c) => c.id === germana.id)) {
        classesPerActualitzar.push(germana);
      }
    }
    if (esCapsEstudisClasse(classe)) {
      for (const dedicacio of trobarDedicacioPerCapEstudis(classe, classes.value)) {
        if (!classesPerActualitzar.some((c) => c.id === dedicacio.id)) {
          classesPerActualitzar.push(dedicacio);
        }
      }
    }

    const batch = writeBatch(db);
    for (const item of classesPerActualitzar) {
      const professorsItem = (item.professors || [item.professorAssignat].filter(Boolean)).filter(
        (nom) => nom && nom !== professor.nom
      );
      batch.update(cursStore.docRef('classes', item.id), {
        professors: professorsItem,
        professorAssignat:
          item.professorAssignat === professor.nom
            ? professorsItem[0] || ''
            : item.professorAssignat || '',
        lastModified: serverTimestamp(),
      });
    }
    await batch.commit();
    updateLastUpdate();
  } catch (e) {
    console.error('Error desassignant classe:', e);
    errorMsg.value = 'Error al desassignar. Torna-ho a intentar.';
  }
}

function handleAssignacionsActualitzades() {
  updateLastUpdate();
}

async function tancarDepartament() {
  if (!departamentSeleccionat.value || departamentTancat.value || !departamentActual.value?.id) return;
  const ok = confirm(
    `Vols tancar el repartiment de ${departamentSeleccionat.value}? Després només l'administració el podrà desbloquejar.`
  );
  if (!ok) return;

  try {
    await updateDoc(cursStore.docRef('departaments', departamentActual.value.id), {
      tancat: true,
      tancatPer: authStore.usuari || authStore.rol || 'usuari',
      tancatAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tancant departament:', error);
    alert('No s\'ha pogut tancar el departament. Revisa els permisos de Firestore.');
  }
}

// Listeners

function setupRealtimeListeners() {
  cleanupListeners();
  if (!cursStore.cursActiuId) {
    classes.value = [];
    professors.value = [];
    departaments.value = [];
    return;
  }

  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snapshot) => {
      classes.value = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          professors: data.professors || [data.professorAssignat].filter(Boolean),
        };
      });
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );

  professorsUnsubscribe = onSnapshot(
    query(cursStore.col('professors')),
    (snapshot) => {
      professors.value = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        preferencia: d.data().preferencia || '',
        jornada: d.data().jornada || '',
        motiuAllegat: d.data().motiuAllegat || '',
        comentaris: d.data().comentaris || '',
        gpAssignades: d.data().gpAssignades || 0,
        palicAssignades: d.data().palicAssignades || 0,
      }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );

  departamentsUnsubscribe = onSnapshot(
    query(cursStore.col('departaments')),
    (snapshot) => {
      departaments.value = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );

  settingsUnsubscribe = subscribeAppSettings(cursStore.cursActiuId, (value) => {
    settings.value = value;
  });
}

function setupUserPresence() {
  if (!departamentSeleccionat.value || !cursStore.cursActiuId) return;

  presenceUnsubscribe?.();
  presenceUnsubscribe = null;
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }

  const presenceRef = doc(
    db,
    'cursos',
    cursStore.cursActiuId,
    'presence',
    `${departamentSeleccionat.value}_${sessionId.value}`
  );
  setDoc(presenceRef, {
    departament: departamentSeleccionat.value,
    sessionId: sessionId.value,
    usuari: authStore.usuari || authStore.rol || 'Usuari',
    rol: authStore.rol || '',
    timestamp: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });

  presenceUnsubscribe = onSnapshot(
    query(
      collection(db, 'cursos', cursStore.cursActiuId, 'presence'),
      where('departament', '==', departamentSeleccionat.value)
    ),
    (snapshot) => {
      const now = Date.now();
      let count = 0;
      const noms = [];
      snapshot.docs.forEach((d) => {
        const lastSeen = d.data().lastSeen?.toMillis?.();
        if (lastSeen && now - lastSeen < 30000) {
          count++;
          noms.push(d.data().usuari || d.data().rol || 'Usuari');
        }
      });
      activeUsers.value = Math.max(1, count);
      usuarisActius.value = [...new Set(noms)];
    }
  );

  presenceInterval = setInterval(() => {
    if (departamentSeleccionat.value) {
      setDoc(
        presenceRef,
        {
          lastSeen: serverTimestamp(),
          usuari: authStore.usuari || authStore.rol || 'Usuari',
          rol: authStore.rol || '',
        },
        { merge: true }
      ).catch(console.error);
    }
  }, 10000);

  window.addEventListener('beforeunload', () => {
    deleteDoc(presenceRef).catch(console.error);
    clearInterval(presenceInterval);
  });
}

function cleanupListeners() {
  classesUnsubscribe?.();
  classesUnsubscribe = null;
  professorsUnsubscribe?.();
  professorsUnsubscribe = null;
  departamentsUnsubscribe?.();
  departamentsUnsubscribe = null;
  presenceUnsubscribe?.();
  presenceUnsubscribe = null;
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
}

// Print

function imprimirDepartament() {
  const printWindow = window.open('', '_blank');
  const printContent =
    document.getElementById('print-content')?.innerHTML || '';
  const printHTML = `<!DOCTYPE html><html><head><title>Assignació - ${departamentSeleccionat.value}</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; padding: 20px; }
  .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
  .print-professor { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; page-break-inside: avoid; }
  .professor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .professor-header h3 { margin: 0; font-size: 16px; }
  .class-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
  @media print { body { padding: 0; } }
</style></head><body>${printContent}</body></html>`;
  printWindow.document.write(printHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

// Lifecycle

watch(departamentSeleccionat, (newDept, oldDept) => {
  if (newDept !== oldDept) {
    if (oldDept && presenceUnsubscribe && cursStore.cursActiuId) {
      deleteDoc(
        doc(db, 'cursos', cursStore.cursActiuId, 'presence', `${oldDept}_${sessionId.value}`)
      ).catch(console.error);
    }
    if (newDept) nextTick(() => setupUserPresence());
  }
});

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });

onMounted(() => {
  if (departamentSeleccionat.value) setupUserPresence();
});

onUnmounted(() => {
  cleanupListeners();
  if (departamentSeleccionat.value && cursStore.cursActiuId) {
    deleteDoc(
      doc(db, 'cursos', cursStore.cursActiuId, 'presence', `${departamentSeleccionat.value}_${sessionId.value}`)
    ).catch(console.error);
  }
});
</script>
