<template>
  <div class="min-h-screen p-2 sm:p-4">
    <div class="container mx-auto overflow-hidden">
    <Transition :name="transicioPantallaDepartament" mode="out-in">
    <section v-if="!pantallaDistribucio" key="selector" class="departament-screen">
      <!-- Selector de departamento -->
      <DepartamentSelector
        v-model="departamentSeleccionat"
        :departaments="departamentsAmbResum"
      />

      <div v-if="!departamentSeleccionat" class="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <p class="text-xl font-semibold text-slate-950">
          Tria un departament per començar la distribució
        </p>
        <p class="mt-2 text-sm font-medium text-slate-600">
          Les targetes mostren l'estat de cada departament abans d'entrar-hi.
        </p>
      </div>
    </section>

    <section v-else key="distribucio" class="departament-screen">
      <div class="sticky top-20 z-30 mb-4 rounded-lg border border-primary/30 bg-white/95 p-3 shadow-primary-glow backdrop-blur print-hide">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <button
              type="button"
              class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              @click="tornarADepartaments"
            >
              <span aria-hidden="true">←</span>
              Departaments
            </button>
            <div class="min-w-0">
              <p class="truncate text-lg font-semibold text-slate-950">{{ departamentSeleccionat }}</p>
              <p class="text-sm font-medium text-slate-600">
                {{ departamentSeleccionatResum?.professorsCount ?? 0 }} professors ·
                {{ formatHores(departamentSeleccionatResum?.horesAssignades) }}/{{ formatHores(departamentSeleccionatResum?.totalHores) }} hores ·
                {{ departamentSeleccionatResum?.classesPendents ?? 0 }} pendents
              </p>
            </div>
          </div>
          <div class="min-w-[12rem]">
            <div class="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Progrés</span>
              <span>{{ departamentSeleccionatResum?.percentatge || 0 }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded bg-primary transition-all"
                :style="{ width: `${departamentSeleccionatResum?.percentatge || 0}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="departamentTancat"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-slate-800"
      >
        Aquest departament està tancat. La distribució es pot consultar, però no modificar.
        <span v-if="settings.missatgeTancament" class="ml-1 font-normal">{{ settings.missatgeTancament }}</span>
      </div>

      <div
        v-if="errorMsg"
        class="mb-4 flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
      >
        {{ errorMsg }}
        <button type="button" class="ml-3 font-semibold hover:underline" @click="errorMsg = null">x</button>
      </div>

      <!-- Indicador de connexió: discret quan OK, visible quan hi ha problema -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2 print-hide">
        <div class="flex flex-wrap items-center gap-2">
          <div v-if="!isConnected"
            class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-800"
          >
            <div class="h-2 w-2 rounded-full bg-red-500"></div>
            Desconnectat
          </div>
          <div v-if="usuarisActius.length > 0"
            class="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            <div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
            {{ usuarisActius.join(', ') }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400">{{ lastUpdate }}</span>
          <button
            v-if="!departamentTancat && !solsLectura"
            type="button"
            class="rounded-md bg-danger px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-danger-dark"
            @click="tancarDepartament"
          >
            Tancar departament
          </button>
        </div>
      </div>

      <!-- Pestanyes + botó imprimir -->
      <div class="mb-5 flex items-center gap-2 print-hide">
        <div class="flex flex-1 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Seccions del departament">
          <button
            id="tab-distribucio"
            role="tab"
            :aria-selected="activeTab === 'distribucio'"
            aria-controls="panel-distribucio"
            @click="activeTab = 'distribucio'"
            class="flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all"
            :class="activeTab === 'distribucio'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
          >
            Distribució
          </button>
          <button
            id="tab-fulla"
            role="tab"
            :aria-selected="activeTab === 'fulla'"
            aria-controls="panel-fulla"
            @click="activeTab = 'fulla'"
            class="flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all"
            :class="activeTab === 'fulla'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
          >
            Full de treball
          </button>
          <button
            id="tab-aleatori"
            role="tab"
            :aria-selected="activeTab === 'aleatori'"
            aria-controls="panel-aleatori"
            @click="activeTab = 'aleatori'"
            class="flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all"
            :class="activeTab === 'aleatori'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
          >
            Proposta
          </button>
        </div>
        <button
          @click="imprimirFulla"
          class="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          title="Imprimir full de treball"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
          </svg>
          Imprimir
        </button>
      </div>

      <!-- Barra sticky de resum del departament -->
      <div class="sticky top-[66px] z-30 -mx-2 sm:-mx-4 mb-4 print-hide">
        <div class="border-b border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
          <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1">
            <span class="font-semibold text-slate-950 dark:text-white">{{ departamentSeleccionat }}</span>
            <span v-if="departamentTancat" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Tancat</span>
            <div class="ml-auto flex flex-wrap items-center gap-4">
              <!-- Hores lectives -->
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 dark:text-slate-400">Hores:</span>
                <span class="text-sm font-bold" :class="totalHoresAssignades === totalHoresDepartament ? 'text-success' : totalHoresAssignades > totalHoresDepartament ? 'text-danger' : 'text-slate-700 dark:text-slate-200'">
                  {{ totalHoresAssignades }}
                </span>
                <span class="text-xs text-slate-400">/ {{ totalHoresDepartament }}</span>
                <div class="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-slate-700">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="totalHoresAssignades === totalHoresDepartament ? 'bg-success' : 'bg-danger'"
                    :style="`width: ${totalHoresDepartament > 0 ? Math.min(100, (totalHoresAssignades / totalHoresDepartament) * 100) : 0}%`"
                  />
                </div>
              </div>
              <!-- GP -->
              <div v-if="totalGPDepartament > 0" class="flex items-center gap-1.5">
                <span class="text-xs text-slate-500 dark:text-slate-400">GP:</span>
                <span class="text-sm font-semibold" :class="totalGPAssignades === totalGPDepartament ? 'text-success' : 'text-danger'">{{ totalGPAssignades }}/{{ totalGPDepartament }}</span>
              </div>
              <!-- PALIC -->
              <div v-if="totalPALICDepartament > 0" class="flex items-center gap-1.5">
                <span class="text-xs text-slate-500 dark:text-slate-400">PALIC:</span>
                <span class="text-sm font-semibold" :class="totalPALICAssignades === totalPALICDepartament ? 'text-success' : 'text-danger'">{{ totalPALICAssignades }}/{{ totalPALICDepartament }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pestanya: Distribució -->
      <div v-show="activeTab === 'distribucio'" id="panel-distribucio" role="tabpanel" aria-labelledby="tab-distribucio">
        <!-- Resum GP, PALIC i hores del departament -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div class="card-stat-primary">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-950">Hores lectives</h3>
                <p class="text-xs text-slate-600 dark:text-gray-400">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-slate-950">
                  {{ totalHoresAssignades }}
                </span>
                <span class="text-slate-500"> / {{ totalHoresDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalHoresAssignades === totalHoresDepartament ? 'bg-success' : 'bg-danger'"
                :style="`width: ${totalHoresDepartament > 0 ? Math.min(100,(totalHoresAssignades/totalHoresDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div v-if="totalGPDepartament > 0" class="card-stat-success">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-950">Guàrdies de pati</h3>
                <p class="text-xs text-slate-600 dark:text-gray-400">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-slate-950">
                  {{ totalGPAssignades }}
                </span>
                <span class="text-slate-500"> / {{ totalGPDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalGPAssignades === totalGPDepartament ? 'bg-success' : 'bg-danger'"
                :style="`width: ${totalGPDepartament > 0 ? Math.min(100,(totalGPAssignades/totalGPDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div v-if="totalPALICDepartament > 0" class="card-stat-danger">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-950">PALIC</h3>
                <p class="text-xs text-slate-600 dark:text-gray-400">Hores assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-slate-950">
                  {{ totalPALICAssignades }}
                </span>
                <span class="text-slate-500"> / {{ totalPALICDepartament }}</span>
              </div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalPALICAssignades === totalPALICDepartament ? 'bg-success' : 'bg-danger'"
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
            <span class="text-sm font-medium text-slate-600">{{ mostrarResumen ? 'Amaga' : 'Mostra' }}</span>
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

        <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
          <div class="lg:sticky lg:top-4">
            <RepartimentHores
              :departamentSeleccionat="departamentSeleccionat"
              :bloquejat="departamentTancat || solsLectura"
              @assignacionsActualitzades="handleAssignacionsActualitzades"
            />
          </div>
          <div>
            <div class="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-slate-950">Professorat</h3>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700">{{ professorsDepartament.length }}</span>
              </div>
              <div class="flex rounded-md border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  class="rounded px-2.5 py-1 transition"
                  :class="ordreProfessorat === 'necessitat' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                  @click="ordreProfessorat = 'necessitat'"
                >
                  Necessitat
                </button>
                <button
                  type="button"
                  class="rounded px-2.5 py-1 transition"
                  :class="ordreProfessorat === 'nom' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                  @click="ordreProfessorat = 'nom'"
                >
                  A-Z
                </button>
              </div>
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
    </section>
    </Transition>

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
import { esGP, esPALIC, esOptativaCompartida, esCoordinacioAmbMembres } from '../utils/tipus';
import { classePertanyDepartament } from '../utils/departaments';
import { trobarGermanesBloc } from '../utils/grups';
import { quotaGuardiesPatiDepartament } from '../utils/guardiesPati';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';
import { E2E_AUTH_BYPASS, getE2ECollection } from '../services/e2e';
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
const activeTab = ref('distribucio');
const ordreProfessorat = ref('necessitat');
const mostrarSelectorDepartaments = ref(true);
const transicioPantallaDepartament = ref('departament-slide-forward');
const settings = ref({ ...DEFAULT_APP_SETTINGS });
const totalGuardiesPatiConfigurades = computed(() =>
  Math.max(0, Math.round(Number(settings.value.totalGuardiesPati ?? 30) || 0))
);
const totalHoresAssignades = computed(() => {
  return classesDepartament.value
    .filter(comptaHoresDepartament)
    .reduce((total, c) => total + horesAssignadesClasse(c), 0);
});

let classesUnsubscribe = null;
let professorsUnsubscribe = null;
let departamentsUnsubscribe = null;
let presenceUnsubscribe = null;
let settingsUnsubscribe = null;
let presenceInterval = null;
let beforeunloadHandler = null;

const sessionId = ref(
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
);

// Computed

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

const departamentsAmbResum = computed(() =>
  departamentsSorted.value.map((dep) => {
    const nom = dep.nom || '';
    const classesDept = classes.value.filter((classe) => classePertanyDepartament(classe, nom));
    const classesComputables = classesDept.filter(comptaHoresDepartament);
    const totalHores = classesComputables.reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
    const horesAssignades = classesComputables.reduce((total, classe) => total + horesAssignadesClasse(classe), 0);
    const classesPendents = classesComputables.filter(
      (classe) => horesAssignadesClasse(classe) < (Number(classe.hores) || 0)
    ).length;
    const professorsCount = professors.value.filter((professor) => professor.departament === nom).length;
    const percentatge = totalHores > 0
      ? Math.min(100, Math.round((horesAssignades / totalHores) * 100))
      : 0;
    const estat = estatDepartamentResum(dep, {
      totalHores,
      horesAssignades,
      classesPendents,
      professorsCount,
    });

    return {
      ...dep,
      classesCount: classesDept.length,
      classesPendents,
      professorsCount,
      totalHores,
      horesAssignades,
      percentatge,
      estat,
    };
  })
);

const departamentSeleccionatResum = computed(() =>
  departamentsAmbResum.value.find((dep) => dep.nom === departamentSeleccionat.value) || null
);
const pantallaDistribucio = computed(() =>
  Boolean(departamentSeleccionat.value) && !mostrarSelectorDepartaments.value
);

const professorsDepartament = computed(() => {
  return professors.value
    .filter((p) => p.departament === departamentSeleccionat.value)
    .sort((a, b) => {
      if (ordreProfessorat.value === 'nom') return a.nom.localeCompare(b.nom);

      const prioritat = prioritatRepartimentProfessor(a) - prioritatRepartimentProfessor(b);
      if (prioritat !== 0) return prioritat;

      const distancia = distanciaIdealProfessor(b) - distanciaIdealProfessor(a);
      if (distancia !== 0) return distancia;

      return a.nom.localeCompare(b.nom);
    });
});

const classesDepartament = computed(() => {
  return classes.value
    .filter((c) => classePertanyDepartament(c, departamentSeleccionat.value))
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
    .filter(comptaHoresDepartament)
    .reduce((total, c) => total + c.hores, 0);
});

const gpOptions = computed(() => ({
  gpExclusions: Array.isArray(settings.value.gpExclusions) ? settings.value.gpExclusions : null,
  gpReductions: settings.value.gpReductions || {},
}));

// GP: quota calculada proporcionalment al nombre de professors del curs.
const totalGPDepartament = computed(() => {
  return quotaGuardiesPatiDepartament(
    professors.value,
    departamentSeleccionat.value,
    totalGuardiesPatiConfigurades.value,
    gpOptions.value
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
        classePertanyDepartament(c, departamentSeleccionat.value) &&
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

function tornarADepartaments() {
  transicioPantallaDepartament.value = 'departament-slide-back';
  mostrarSelectorDepartaments.value = true;
}

function formatHores(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? number.toString() : number.toFixed(1);
}

function formatProfessorsNecessaris() {
  const totalHores = totalHoresDepartament.value;
  const exactProfessors = totalHores / 18;
  return (Math.round(exactProfessors * 10) / 10).toString();
}

function esOptativaCompartidaClasse(classe) {
  return esOptativaCompartida(classe.tipus);
}

function comptaHoresDepartament(classe) {
  return !esGP(classe.tipus) && !esPALIC(classe.tipus);
}

function horesAssignadesClasse(classe) {
  const assignats = professorsClasse(classe).length;
  if (!assignats) return 0;
  if (esOptativaCompartidaClasse(classe)) {
    return ((Number(classe.hores) || 0) / 2) * Math.min(assignats, 2);
  }
  return Number(classe.hores) || 0;
}

const classesPorProfessorMap = computed(() => {
  const map = new Map();
  for (const c of classes.value) {
    if (esGP(c.tipus) || esPALIC(c.tipus)) continue;
    for (const nom of professorsClasse(c)) {
      if (!nom) continue;
      if (!map.has(nom)) map.set(nom, []);
      map.get(nom).push(c);
    }
  }
  for (const [, llista] of map) {
    llista.sort((a, b) => {
      if (a.curs !== b.curs) return (a.curs || '').localeCompare(b.curs || '');
      if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
      return (a.grup || '').localeCompare(b.grup || '');
    });
  }
  return map;
});

const horesPorProfessorMap = computed(() => {
  const map = new Map();
  for (const c of classes.value) {
    if (esGP(c.tipus)) continue;
    const hores = horesComputablesClasse(c);
    for (const nom of professorsClasse(c)) {
      if (!nom) continue;
      map.set(nom, (map.get(nom) || 0) + hores);
    }
  }
  return map;
});

function getClassesProfessor(nomProfessor) {
  return classesPorProfessorMap.value.get(nomProfessor) || [];
}

function calcularHoresProfessor(nomProfessor) {
  return horesPorProfessorMap.value.get(nomProfessor) || 0;
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

function distanciaIdealProfessor(professor) {
  const limits = limitsHoresProfessor(professor);
  return limits.ideal - calcularHoresComputablesProfessor(professor.nom);
}

function prioritatRepartimentProfessor(professor) {
  const hores = calcularHoresComputablesProfessor(professor.nom);
  const limits = limitsHoresProfessor(professor);
  if (hores < limits.ideal) return 0;
  if (hores === limits.ideal) return 1;
  if (hores <= limits.maxim) return 2;
  return 3;
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

function estatDepartamentResum(departament, resum) {
  if (departament.tancat) return 'tancat';
  if (!resum.professorsCount && !resum.totalHores) return 'buit';
  if (resum.horesAssignades > resum.totalHores) return 'exces';
  if (resum.totalHores > 0 && resum.horesAssignades === resum.totalHores && resum.classesPendents === 0) {
    return 'complet';
  }
  return 'pendent';
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
    `Vols tancar la distribució de ${departamentSeleccionat.value}? Després només l'administració el podrà desbloquejar.`
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
  if (E2E_AUTH_BYPASS) {
    classes.value = getE2ECollection('classes');
    professors.value = getE2ECollection('professors');
    departaments.value = getE2ECollection('departaments');
    settings.value = { ...DEFAULT_APP_SETTINGS };
    if (!departamentSeleccionat.value) {
      departamentSeleccionat.value = departaments.value[0]?.nom || '';
    }
    updateLastUpdate();
    isConnected.value = true;
    return;
  }
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
  if (E2E_AUTH_BYPASS) return;
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
    scope: 'departament',
    departament: departamentSeleccionat.value,
    sessionId: sessionId.value,
    uid: authStore.uid || '',
    usuari: authStore.usuari || authStore.rol || 'Usuari',
    email: authStore.email || '',
    photoURL: authStore.photoURL || '',
    rol: authStore.rol || '',
    path: '/departament',
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
          uid: authStore.uid || '',
          usuari: authStore.usuari || authStore.rol || 'Usuari',
          email: authStore.email || '',
          photoURL: authStore.photoURL || '',
          rol: authStore.rol || '',
          path: '/departament',
        },
        { merge: true }
      ).catch(console.error);
    }
  }, 10000);

  if (beforeunloadHandler) {
    window.removeEventListener('beforeunload', beforeunloadHandler);
  }
  beforeunloadHandler = () => {
    deleteDoc(presenceRef).catch(console.error);
    clearInterval(presenceInterval);
  };
  window.addEventListener('beforeunload', beforeunloadHandler);
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
  if (beforeunloadHandler) {
    window.removeEventListener('beforeunload', beforeunloadHandler);
    beforeunloadHandler = null;
  }
}

// Print

function imprimirFulla() {
  activeTab.value = 'fulla';
  setTimeout(() => window.print(), 150);
}

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
    if (newDept) {
      transicioPantallaDepartament.value = 'departament-slide-forward';
      mostrarSelectorDepartaments.value = false;
      activeTab.value = 'distribucio';
    } else {
      mostrarSelectorDepartaments.value = true;
    }
    if (!E2E_AUTH_BYPASS && oldDept && presenceUnsubscribe && cursStore.cursActiuId) {
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
  if (!E2E_AUTH_BYPASS && departamentSeleccionat.value && cursStore.cursActiuId) {
    deleteDoc(
      doc(db, 'cursos', cursStore.cursActiuId, 'presence', `${departamentSeleccionat.value}_${sessionId.value}`)
    ).catch(console.error);
  }
});
</script>

<style scoped>
.departament-screen {
  min-width: 0;
}

.departament-slide-forward-enter-active,
.departament-slide-forward-leave-active,
.departament-slide-back-enter-active,
.departament-slide-back-leave-active {
  transition: opacity 220ms ease, transform 260ms ease;
}

.departament-slide-forward-enter-from {
  opacity: 0;
  transform: translateX(3rem);
}

.departament-slide-forward-leave-to {
  opacity: 0;
  transform: translateX(-3rem);
}

.departament-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-3rem);
}

.departament-slide-back-leave-to {
  opacity: 0;
  transform: translateX(3rem);
}

@media (prefers-reduced-motion: reduce) {
  .departament-slide-forward-enter-active,
  .departament-slide-forward-leave-active,
  .departament-slide-back-enter-active,
  .departament-slide-back-leave-active {
    transition: opacity 120ms ease;
  }

  .departament-slide-forward-enter-from,
  .departament-slide-forward-leave-to,
  .departament-slide-back-enter-from,
  .departament-slide-back-leave-to {
    transform: none;
  }
}
</style>
