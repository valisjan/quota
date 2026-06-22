<template>
  <div class="min-h-screen p-2 sm:p-4">
    <div class="container mx-auto overflow-x-clip">
    <Transition :name="transicioPantallaDepartament" mode="out-in">
    <section v-if="!pantallaDistribucio" key="selector" class="departament-screen">
      <div v-if="carregantDadesDepartament" class="department-loading-card app-card mb-6 p-5 sm:p-6">
        <div class="flex items-center gap-4">
          <div class="department-loading-mark" aria-hidden="true"></div>
          <div class="min-w-0">
            <p class="text-base font-semibold text-text-main">Carregant departaments...</p>
            <p class="mt-1 text-sm font-medium text-text-secondary">
              Preparant classes, professorat i resum de distribució.
            </p>
          </div>
        </div>
      </div>

      <!-- Selector de departamento -->
      <DepartamentSelector
        v-else
        v-model="departamentSeleccionat"
        :departaments="departamentsAmbResum"
      />

      <div v-if="!departamentSeleccionat && !carregantDadesDepartament" class="app-empty-state">
        <p class="text-xl font-semibold text-text-main">
          Tria un departament per començar la distribució
        </p>
        <p class="mt-2 text-sm font-medium text-text-secondary">
          Les targetes mostren l'estat de cada departament abans d'entrar-hi.
        </p>
      </div>
    </section>

    <section v-else key="distribucio" class="departament-screen">
      <div v-if="carregantDadesDepartament" class="department-loading-card app-card mb-6 p-5 sm:p-6">
        <div class="flex items-center gap-4">
          <div class="department-loading-mark" aria-hidden="true"></div>
          <div class="min-w-0">
            <p class="text-base font-semibold text-text-main">Carregant {{ departamentSeleccionat }}</p>
            <p class="mt-1 text-sm font-medium text-text-secondary">
              Preparant les dades de distribució del departament.
            </p>
          </div>
        </div>
      </div>

      <template v-else>
      <div class="department-sticky-bar sticky top-[4.45rem] z-30 mb-3 backdrop-blur print-hide">
        <div class="flex min-h-16 items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              @click="tornarADepartaments"
              aria-label="Tornar als departaments"
            >
              <span aria-hidden="true">←</span>
              <span class="hidden sm:inline">Torna</span>
            </button>
            <div
              class="app-card-soft flex h-10 w-10 shrink-0 items-center justify-center text-text-secondary sm:h-11 sm:w-11"
              aria-hidden="true"
            >
              <span v-if="deptIconText" class="dept-icon-text" :class="{ 'dept-icon-text-small': deptIconText.length > 1 }">{{ deptIconText }}</span>
              <span v-else-if="deptFlagClass" class="dept-flag" :class="deptFlagClass"></span>
              <svg v-else-if="deptIconPaths.length" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                <path v-for="path in deptIconPaths" :key="path" stroke-linecap="round" stroke-linejoin="round" :d="path" />
              </svg>
              <span v-else class="text-sm font-black">{{ deptInicials }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex min-w-0 items-center gap-3">
                <p class="truncate text-lg font-bold text-text-main">{{ departamentSeleccionat }}</p>
                <span class="inline-flex shrink-0 items-baseline gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
                  <span class="text-xl font-black leading-none">{{ professorsDepartament.length }}</span>
                  <span class="text-sm font-bold leading-none">
                    {{ professorsDepartament.length === 1 ? 'professor' : 'professors' }}
                  </span>
                </span>
                <span class="hidden shrink-0 text-base font-semibold text-text-secondary md:inline">
                  {{ resumStickyDepartament }}
                </span>
              </div>
              <p class="truncate text-sm font-semibold text-text-secondary md:hidden">
                {{ resumStickyDepartament }}
              </p>
            </div>
          <div class="hidden w-32 shrink-0 sm:block lg:w-40">
            <div class="mb-1 flex items-center justify-end text-base font-bold text-text-secondary">
              <span>{{ departamentSeleccionatResum?.percentatge || 0 }}%</span>
            </div>
            <div class="app-progress-track h-2">
              <div
                class="app-progress-fill h-2"
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
            class="app-chip flex items-center gap-1.5 text-sm"
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

      <section
        v-if="validacioDepartament.items.length"
        class="mb-3 overflow-hidden rounded-lg border px-3 py-2 print-hide"
        :class="validacioDepartament.estat === 'bloquejat' ? 'validation-panel-critical' : 'validation-panel-warning'"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-text-main">Validació</span>
            <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="validacioEstatClass">
              {{ validacioEstatText }}
            </span>
            <span class="text-xs font-semibold text-text-secondary">
              {{ validacioDepartament.critiques.length }} crítics · {{ validacioDepartament.avisos.length }} avisos
            </span>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              v-if="validacioDepartament.critiques.length"
              type="button"
              class="rounded-md border border-border-soft bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-hover"
              @click="anarAProblema(validacioDepartament.critiques[0])"
            >
              Primer problema
            </button>
            <button
              type="button"
              class="rounded-md border border-border-soft bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-hover"
              @click="mostrarValidacioDistribucio = !mostrarValidacioDistribucio"
            >
              {{ mostrarValidacioDistribucio ? 'Amaga' : 'Veure' }}
            </button>
          </div>
        </div>
        <div
          v-if="mostrarValidacioDistribucio"
          class="mt-2 grid grid-cols-1 gap-2 border-t border-border-soft pt-2 lg:grid-cols-2"
        >
          <article
            v-for="item in validacioItemsVisibles"
            :key="item.id"
            class="validation-issue-card rounded-lg border bg-white px-3 py-2"
            :class="item.severitat === 'critica' ? 'border-rose-200' : 'border-amber-200'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="classeSeveritatValidacio(item)">
                    {{ item.severitat === 'critica' ? 'Crític' : 'Avís' }}
                  </span>
                  <span class="text-xs font-semibold text-text-muted">{{ item.categoria }}</span>
                </div>
                <h4 class="mt-1 text-sm font-semibold text-text-main">{{ item.titol }}</h4>
                <p class="mt-0.5 text-xs font-medium text-text-secondary">{{ item.detall }}</p>
                <p v-if="item.context" class="mt-1 text-xs text-text-muted">{{ item.context }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border border-border-soft bg-surface px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-hover"
                @click="anarAProblema(item)"
              >
                Anar
              </button>
            </div>
          </article>
        </div>
        <p
          v-if="mostrarValidacioDistribucio && validacioRestants > 0"
          class="border-t border-border-soft px-4 py-2 text-xs font-semibold text-text-muted"
        >
          + {{ validacioRestants }} incidències més
        </p>
      </section>

      <!-- Pestanyes + botó imprimir -->
      <div class="department-actions mb-5 print-hide">
        <div class="app-toolbar department-tabs min-w-0" role="tablist" aria-label="Seccions del departament">
          <button
            id="tab-distribucio"
            role="tab"
            :aria-selected="activeTab === 'distribucio'"
            aria-controls="panel-distribucio"
            @click="activeTab = 'distribucio'"
            class="app-toolbar-button department-tab"
            :class="activeTab === 'distribucio'
              ? 'app-toolbar-button-active'
              : ''"
          >
            Distribució
          </button>
          <button
            id="tab-fulla"
            role="tab"
            :aria-selected="activeTab === 'fulla'"
            aria-controls="panel-fulla"
            @click="activeTab = 'fulla'"
            class="app-toolbar-button department-tab"
            :class="activeTab === 'fulla'
              ? 'app-toolbar-button-active'
              : ''"
          >
            Full de treball
          </button>
          <button
            id="tab-aleatori"
            role="tab"
            :aria-selected="activeTab === 'aleatori'"
            aria-controls="panel-aleatori"
            @click="activeTab = 'aleatori'"
            class="app-toolbar-button department-tab"
            :class="activeTab === 'aleatori'
              ? 'app-toolbar-button-active'
              : ''"
          >
            Proposta
          </button>
        </div>
        <button
          @click="imprimirFulla"
          class="app-button-secondary w-full shrink-0 sm:w-auto"
          title="Imprimir full de treball"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
          </svg>
          Imprimir
        </button>
      </div>

      <!-- Pestanya: Distribució -->
      <div v-show="activeTab === 'distribucio'" id="panel-distribucio" role="tabpanel" aria-labelledby="tab-distribucio">
        <!-- Resum GP, PALIC, SD i hores del departament -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-5 items-start">
          <div class="space-y-3 lg:sticky lg:top-4">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1" data-validation-summary tabindex="-1">
          <div class="card-stat-primary">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-text-main">Total hores</h3>
                <p class="text-xs text-text-secondary">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-text-main">
                  {{ totalHoresAssignades }}
                </span>
                <span class="text-xl font-bold text-text-secondary"> / {{ totalHoresDepartament }}</span>
              </div>
            </div>
            <div class="app-progress-track mt-2 h-2 w-full">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalHoresAssignades === totalHoresDepartament ? 'bg-success' : 'bg-danger'"
                :style="`width: ${totalHoresDepartament > 0 ? Math.min(100,(totalHoresAssignades/totalHoresDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div class="card-stat-warning">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-text-main">Mitjana per professor</h3>
                <p class="text-xs text-text-secondary">
                  {{ professorsDepartament.length }} professor{{ professorsDepartament.length !== 1 ? 's' : '' }}
                </p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-text-main">
                  {{ horesPerProfessorDepartament }}
                </span>
                <span class="text-xl font-bold text-text-secondary"> h</span>
              </div>
            </div>
            <p class="mt-2 text-sm font-medium text-text-secondary">
              {{ totalHoresDepartament }} hores totals / professorat del departament
            </p>
          </div>

          <div v-if="mostraTargetaGPDepartament" class="card-stat-success">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-text-main">Guàrdies de pati</h3>
                <p class="text-xs text-text-secondary">Assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-text-main">
                  {{ totalGPAssignades }}
                </span>
                <span class="text-xl font-bold text-text-secondary"> / {{ totalGPDepartament }}</span>
              </div>
            </div>
            <div class="app-progress-track mt-2 h-2 w-full">
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
                <h3 class="font-bold text-text-main">PALIC</h3>
                <p class="text-xs text-text-secondary">Hores assignades als professors</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-text-main">
                  {{ totalPALICAssignades }}
                </span>
                <span class="text-xl font-bold text-text-secondary"> / {{ totalPALICDepartament }}</span>
              </div>
            </div>
            <div class="app-progress-track mt-2 h-2 w-full">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalPALICAssignades === totalPALICDepartament ? 'bg-success' : 'bg-danger'"
                :style="`width: ${totalPALICDepartament > 0 ? Math.min(100,(totalPALICAssignades/totalPALICDepartament)*100) : 0}%`"
              />
            </div>
          </div>

          <div v-if="totalSDDepartament > 0" class="card-stat-warning">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-text-main">Suport divisible</h3>
                <p class="text-xs text-text-secondary">Hores de suport assignades</p>
              </div>
              <div class="text-right">
                <span class="text-xl font-bold text-text-main">
                  {{ totalSDAssignades }}
                </span>
                <span class="text-xl font-bold text-text-secondary"> / {{ totalSDDepartament }}</span>
              </div>
            </div>
            <div class="app-progress-track mt-2 h-2 w-full">
              <div
                class="h-2 rounded-sm transition-all"
                :class="totalSDAssignades === totalSDDepartament ? 'bg-success' : 'bg-danger'"
                :style="`width: ${totalSDDepartament > 0 ? Math.min(100,(totalSDAssignades/totalSDDepartament)*100) : 0}%`"
              />
            </div>
          </div>
            </div>
            <RepartimentHores
              :departamentSeleccionat="departamentSeleccionat"
              :bloquejat="departamentTancat || solsLectura"
              :focus-class-id="focusClassId"
              @assignacionsActualitzades="handleAssignacionsActualitzades"
            />
          </div>
          <div>
            <div class="app-card mb-3 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-text-main">Professorat</h3>
                <span class="app-chip">{{ professorsDepartament.length }}</span>
              </div>
              <span class="app-chip text-xs font-medium">Ordre alfabètic</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
              <ProfessorCard
                v-for="professor in professorsDepartament"
                :key="professor.id"
                :professor="professor"
                :classes="getClassesProfessor(professor.nom)"
                :hores-lectives="calcularHoresProfessor(professor.nom)"
                :hores-gp="getHoresGP(professor.nom)"
                :hores-palic="getHoresPALIC(professor.nom)"
                :hores-sd="getHoresSD(professor.nom)"
                :sd-assignacions="getSDAssignacions(professor.nom)"
                :hores-gc="getHoresGC(professor.nom)"
                :guardes-previstes="getGuardesPrevistes(professor.nom)"
                :mostra-gp="totalGPDepartament > 0 || totalGPAssignades > 0"
                :mostra-gc="true"
                :grups-sd="grupsDisponiblesSD"
                :total-gp-departament="totalGPDepartament"
                :total-gp-assignades="totalGPAssignades"
                :total-palic-departament="totalPALICDepartament"
                :total-palic-assignades="totalPALICAssignades"
                :total-sd-departament="totalSDDepartament"
                :total-sd-assignades="totalSDAssignades"
                :coordinacions="coordinacions"
                :bloquejat="departamentTancat || solsLectura"
                @actualitzar-professor="actualitzarProfessor"
                @incrementar-gp="incrementarGP"
                @decrementar-gp="decrementarGP"
                @incrementar-palic="incrementarPALIC"
                @decrementar-palic="decrementarPALIC"
                @incrementar-sd="incrementarSD"
                @decrementar-sd="decrementarSD"
                @actualitzar-sd-grup="actualitzarSDGrup"
                @incrementar-gc="incrementarGC"
                @decrementar-gc="decrementarGC"
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
          :total-sd-departament="totalSDDepartament"
          :total-sd-assignades="totalSDAssignades"
          :get-classes-professor="getClassesProfessor"
          :calcular-hores-professor="calcularHoresProfessor"
          :get-hores-gp="getHoresGP"
          :get-hores-palic="getHoresPALIC"
          :get-hores-sd="getHoresSD"
          :get-sd-assignacions="getSDAssignacions"
        />
      </div>
      </template>
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
      :total-sd="totalSDDepartament"
      :total-sd-assignades="totalSDAssignades"
      :get-classes-professor="getClassesProfessor"
      :calcular-hores-professor="calcularHoresProfessor"
      :get-hores-gp="getHoresGP"
      :get-hores-palic="getHoresPALIC"
      :get-hores-sd="getHoresSD"
      :get-sd-assignacions="getSDAssignacions"
      :is-perfect-hours="isPerfectHours"
      :is-over-recommended="isOverRecommended"
      :is-over-limit="isOverLimit"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted, watch } from 'vue';
import { db } from '../firebase';
import { writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import RepartimentHores from '../components/RepartimentHores.vue';
import DepartamentSelector from '../components/departament/DepartamentSelector.vue';
import DepartamentFulla from '../components/departament/DepartamentFulla.vue';
import DepartamentAleatori from '../components/departament/DepartamentAleatori.vue';
import ProfessorCard from '../components/departament/ProfessorCard.vue';
import DepartamentPrintModal from '../components/departament/DepartamentPrintModal.vue';
import { professorsClasse, horesComputablesClasse } from '../utils/horesProfessor';
import { departamentIconText, departamentFlagClass, departamentIconPaths, departamentInicials } from '../utils/departamentIcon';
import { esGP, esPALIC, esSuportDivisible, esOptativaCompartida, esCoordinacioAmbMembres, exclosaDelRepartiment } from '../utils/tipus';
import { classePertanyDepartament } from '../utils/departaments';
import { comptarSDAssignacions, crearSDAssignacio, normalitzarSDAssignacions } from '../utils/suportDivisible';
import { quotaGuardiesPatiDepartament } from '../utils/guardiesPati';
import { guardesQueTocaFer } from '../utils/guardes';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';
import { E2E_AUTH_BYPASS, getE2ECollection } from '../services/e2e';
import {
  crearActualitzacionsAssignacio,
  crearActualitzacionsDesassignacioProfessor,
} from '../services/assignacioRules';
import { classeCompletamentAssignada } from '../utils/assignacions';
import { calcularValidacioDepartament } from '../services/validacioDepartament';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { usePresenceDepartament } from '../composables/usePresenceDepartament';

const departamentSeleccionat = ref('');
const authStore = useAuthStore();
const cursStore = useCursStore();
const toast = useToastStore();
const solsLectura = computed(() => authStore.rol === 'professor');
const mostrarResumen = ref(false);
const mostrarValidacioDistribucio = ref(false);
const activeTab = ref('distribucio');
const focusClassId = ref('');
const mostrarSelectorDepartaments = ref(true);
const transicioPantallaDepartament = ref('departament-slide-forward');
const settings = ref({ ...DEFAULT_APP_SETTINGS });
const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

// Subscripcions Firestore
const {
  items: classes,
  loading: classesLoading,
  isConnected: classesOk,
  error: classesError,
  lastUpdate,
} = useCursCollectionSnapshot({
  colName: 'classes',
  mapDoc: (d) => {
    const data = d.data();
    return { id: d.id, ...data, professors: data.professors || [data.professorAssignat].filter(Boolean) };
  },
});
const {
  items: professors,
  loading: profsLoading,
  isConnected: profsOk,
  error: profsError,
} = useCursCollectionSnapshot({
  colName: 'professors',
  mapDoc: (d) => {
    const data = d.data();
    return {
      id: d.id, ...data,
      preferencia: data.preferencia || '',
      jornada: data.jornada || '',
      motiuAllegat: data.motiuAllegat || '',
      comentaris: data.comentaris || '',
      gpAssignades: data.gpAssignades || 0,
      palicAssignades: data.palicAssignades || 0,
      sdAssignacions: normalitzarSDAssignacions(data.sdAssignacions, data.sdAssignades),
      sdAssignades: comptarSDAssignacions(data),
      gcAssignades: data.gcAssignades || 0,
      exempteGuardies: data.exempteGuardies || false,
    };
  },
});
const {
  items: departaments,
  loading: deptLoading,
  isConnected: deptsOk,
  error: deptsError,
} = useCursCollectionSnapshot({ colName: 'departaments' });

const isConnected = computed(() => classesOk.value && profsOk.value && deptsOk.value);

// errorMsg és dismissible — el watcher l'omple des dels errors del composable
const errorMsg = ref(null);
watch([classesError, profsError, deptsError], ([ce, pe, de]) => {
  if (ce) { errorMsg.value = "No s'han pogut carregar les classes."; return; }
  if (pe) { errorMsg.value = "No s'ha pogut carregar el professorat."; return; }
  if (de) { errorMsg.value = "No s'han pogut carregar els departaments."; }
});

// Presència en temps real
const { activeUsers, usuarisActius } = usePresenceDepartament({
  departamentSeleccionat,
  authStore,
  cursStore,
  sessionId,
});

// Settings
let settingsUnsubscribe = null;
watch(() => cursStore.cursActiuId, (cursId) => {
  settingsUnsubscribe?.();
  settingsUnsubscribe = null;
  if (!cursId || E2E_AUTH_BYPASS) { settings.value = { ...DEFAULT_APP_SETTINGS }; return; }
  settingsUnsubscribe = subscribeAppSettings(cursId, (v) => { settings.value = v; });
}, { immediate: true });
onUnmounted(() => settingsUnsubscribe?.());

const totalGuardiesPatiConfigurades = computed(() =>
  Math.max(0, Math.round(Number(settings.value.totalGuardiesPati ?? 30) || 0))
);
const totalHoresAssignades = computed(() => {
  return classesDepartament.value
    .filter(comptaHoresDepartament)
    .reduce((total, c) => total + horesAssignadesClasse(c), 0)
    + totalPALICAssignades.value
    + totalSDAssignades.value;
});

// Computed

const professorsActius = computed(() => professors.value.filter((p) => !p.eliminatDelFull));

const departamentsSorted = computed(() => {
  return [...departaments.value].sort((a, b) => a.nom.localeCompare(b.nom));
});

const departamentsAmbResum = computed(() =>
  departamentsSorted.value.map((dep) => {
    const nom = dep.nom || '';
    const classesDept = classes.value.filter((classe) => classePertanyDepartament(classe, nom));
    const classesComputables = classesDept.filter(comptaHoresDepartament);
    const totalPALIC = classesDept
      .filter((classe) => esPALIC(classe.tipus))
      .reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
    const palicAssignades = professorsActius.value
      .filter((professor) => professor.departament === nom)
      .reduce((total, professor) => total + (Number(professor.palicAssignades) || 0), 0);
    const totalSD = classesDept
      .filter((classe) => esSuportDivisible(classe.tipus))
      .reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
    const sdAssignades = professorsActius.value
      .filter((professor) => professor.departament === nom)
      .reduce((total, professor) => total + comptarSDAssignacions(professor), 0);
    const totalHores = classesComputables.reduce((total, classe) => total + (Number(classe.hores) || 0), 0) + totalPALIC + totalSD;
    const horesAssignades = classesComputables.reduce((total, classe) => total + horesAssignadesClasse(classe), 0) + palicAssignades + sdAssignades;
    const classesPendentsBase = classesComputables.filter(
      (classe) => horesAssignadesClasse(classe) < (Number(classe.hores) || 0)
    ).length;
    const classesPendents = classesPendentsBase
      + (palicAssignades < totalPALIC ? 1 : 0)
      + (sdAssignades < totalSD ? 1 : 0);
    const professorsCount = professorsActius.value.filter((professor) => professor.departament === nom).length;
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

const deptIconText = computed(() => departamentIconText(departamentSeleccionat.value || ''));
const deptFlagClass = computed(() => departamentFlagClass(departamentSeleccionat.value || ''));
const deptIconPaths = computed(() => departamentIconPaths(departamentSeleccionat.value || ''));
const deptInicials = computed(() => departamentInicials(departamentSeleccionat.value || ''));
const pantallaDistribucio = computed(() =>
  Boolean(departamentSeleccionat.value) && !mostrarSelectorDepartaments.value
);
const carregantDadesDepartament = computed(() =>
  Boolean(cursStore.cursActiuId) && (classesLoading.value || profsLoading.value || deptLoading.value)
);
const resumStickyDepartament = computed(() => {
  const resum = departamentSeleccionatResum.value;
  return `${formatHores(resum?.horesAssignades)}/${formatHores(resum?.totalHores)} h · ${resum?.classesPendents ?? 0} elements per assignar`;
});

const professorsDepartament = computed(() => {
  return professors.value
    .filter((p) => p.departament === departamentSeleccionat.value && !p.eliminatDelFull)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'ca'));
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

const classesAutoAssignablesDepartament = computed(() =>
  classesDepartament.value.filter(
    (classe) =>
      !classeCompletamentAssignada(classe) &&
      !exclosaDelRepartiment(classe.tipus)
  )
);

const autoAssignacioKey = computed(() => {
  if (!departamentSeleccionat.value) return '';
  if (professorsDepartament.value.length !== 1) return '';
  if (!classesAutoAssignablesDepartament.value.length) return '';
  return [
    departamentSeleccionat.value,
    professorsDepartament.value[0]?.id || professorsDepartament.value[0]?.nom || '',
    ...classesAutoAssignablesDepartament.value.map((classe) => classe.id).sort(),
  ].join('|');
});

const autoAssignacionsEnCurs = ref(new Set());

const totalHoresDepartament = computed(() => {
  return classesDepartament.value
    .filter(comptaHoresDepartament)
    .reduce((total, c) => total + (Number(c.hores) || 0), 0)
    + totalPALICDepartament.value
    + totalSDDepartament.value;
});

const horesPerProfessorDepartament = computed(() => {
  const totalProfessors = professorsDepartament.value.length;
  if (!totalProfessors) return '0';
  return formatHores(totalHoresDepartament.value / totalProfessors);
});

const gpOptions = computed(() => ({
  gpExclusions: Array.isArray(settings.value.gpExclusions) ? settings.value.gpExclusions : null,
  gpReductions: settings.value.gpReductions || {},
}));

// GP: quota calculada proporcionalment al nombre de professors del curs.
const totalGPDepartament = computed(() => {
  return quotaGuardiesPatiDepartament(
    professorsActius.value,
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

const mostraTargetaGPDepartament = computed(() =>
  totalGPDepartament.value > 0 || totalGPAssignades.value > 0
);

// PALIC: pool total del departament.
const totalPALICDepartament = computed(() => {
  return classes.value
    .filter(
      (c) =>
        esPALIC(c.tipus) &&
        classePertanyDepartament(c, departamentSeleccionat.value)
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

// SD: pool total de suport divisible del departament.
const totalSDDepartament = computed(() => {
  return classes.value
    .filter(
      (c) =>
        esSuportDivisible(c.tipus) &&
        classePertanyDepartament(c, departamentSeleccionat.value)
    )
    .reduce((total, c) => total + (Number(c.hores) || 0), 0);
});

const totalSDAssignades = computed(() => {
  return professorsDepartament.value.reduce(
    (total, p) => total + comptarSDAssignacions(p),
    0
  );
});

const grupsDisponiblesSD = computed(() => {
  const grups = new Set();
  for (const classe of classes.value) {
    const curs = (classe.curs || '').toString().trim();
    const grup = (classe.grup || '').toString().trim();
    if (!curs || !grup) continue;
    grup
      .split('+')
      .map((valor) => valor.trim())
      .filter(Boolean)
      .forEach((grupNet) => grups.add(`${curs} ${grupNet}`));
  }
  return [...grups].sort((a, b) => a.localeCompare(b, 'ca'));
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

const validacioDepartament = computed(() =>
  calcularValidacioDepartament({
    departament: departamentSeleccionat.value,
    classes: classes.value,
    professors: professorsActius.value,
    totalGPDepartament: totalGPDepartament.value,
    totalGPAssignades: totalGPAssignades.value,
    totalPALICDepartament: totalPALICDepartament.value,
    totalPALICAssignades: totalPALICAssignades.value,
    totalSDDepartament: totalSDDepartament.value,
    totalSDAssignades: totalSDAssignades.value,
  })
);

const validacioItemsVisibles = computed(() => [
  ...validacioDepartament.value.critiques,
  ...validacioDepartament.value.avisos,
].slice(0, 8));

const validacioRestants = computed(() =>
  Math.max(0, validacioDepartament.value.items.length - validacioItemsVisibles.value.length)
);

const validacioEstatText = computed(() => {
  if (validacioDepartament.value.estat === 'bloquejat') return 'Bloquejat';
  if (validacioDepartament.value.estat === 'revisar') return 'Revisar';
  return 'Pot tancar';
});

const validacioEstatClass = computed(() => {
  if (validacioDepartament.value.estat === 'bloquejat') return 'bg-rose-100 text-rose-800';
  if (validacioDepartament.value.estat === 'revisar') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
});

// Funcions

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
  return !esGP(classe.tipus) && !esPALIC(classe.tipus) && !esSuportDivisible(classe.tipus);
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
    if (esGP(c.tipus) || esPALIC(c.tipus) || esSuportDivisible(c.tipus)) continue;
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
    if (esGP(c.tipus) || esPALIC(c.tipus) || esSuportDivisible(c.tipus)) continue;
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

function getSDAssignacions(nomProfessor) {
  const professor = getProfessor(nomProfessor);
  return normalitzarSDAssignacions(professor.sdAssignacions, professor.sdAssignades);
}

function getHoresSD(nomProfessor) {
  return getSDAssignacions(nomProfessor).length;
}

function getHoresGC(nomProfessor) {
  return getProfessor(nomProfessor).gcAssignades || 0;
}

function getGuardesPrevistes(nomProfessor) {
  const prof = getProfessor(nomProfessor);
  if (!prof.nom) return null;
  return guardesQueTocaFer(prof, classes.value);
}

function estatDepartamentResum(departament, resum) {
  if (departament.exclos) return 'exclos';
  if (departament.tancat) return 'tancat';
  if (!resum.professorsCount && !resum.totalHores) return 'buit';
  if (resum.horesAssignades > resum.totalHores) return 'exces';
  if (resum.totalHores > 0 && resum.horesAssignades === resum.totalHores && resum.classesPendents === 0) {
    return 'complet';
  }
  return 'pendent';
}

function classeSeveritatValidacio(item) {
  return item.severitat === 'critica'
    ? 'bg-rose-100 text-rose-800'
    : 'bg-amber-100 text-amber-800';
}

function trobarTargetValidacio(item) {
  if (item?.target?.type === 'classe') {
    return [...document.querySelectorAll('[data-validation-class-id]')]
      .find((el) => el.dataset.validationClassId === item.target.id);
  }
  if (item?.target?.type === 'professor') {
    return [...document.querySelectorAll('[data-validation-professor]')]
      .find((el) => el.dataset.validationProfessor === item.target.nom);
  }
  return document.querySelector('[data-validation-summary]');
}

async function anarAProblema(item) {
  if (!item) return;
  activeTab.value = 'distribucio';
  if (item.target?.type === 'classe') {
    focusClassId.value = '';
    await nextTick();
    focusClassId.value = item.target.id;
  }
  await nextTick();
  const target = trobarTargetValidacio(item);
  if (!target) {
    toast.info('No es veu el problema en aquesta vista. Revisa la llista de distribució.');
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.remove('validation-target-highlight');
  window.setTimeout(() => {
    target.classList.add('validation-target-highlight');
    try {
      target.focus({ preventScroll: true });
    } catch (_) {
      target.focus?.();
    }
  }, 180);
  window.setTimeout(() => target.classList.remove('validation-target-highlight'), 2200);
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

// GC

async function incrementarGC(professor) {
  if (departamentTancat.value) return;
  if ((professor.gcAssignades || 0) >= 2) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      gcAssignades: (professor.gcAssignades || 0) + 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    toast.error("No s'ha pogut guardar la guàrdia de convivència: " + (e.message || ''));
  }
}

async function decrementarGC(professor) {
  if (departamentTancat.value) return;
  if (!professor.gcAssignades || professor.gcAssignades <= 0) return;
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      gcAssignades: professor.gcAssignades - 1,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    toast.error("No s'ha pogut guardar la guàrdia de convivència: " + (e.message || ''));
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
    toast.error("No s'ha pogut guardar el PALIC: " + (e.message || e.code || ''));
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
    toast.error("No s'ha pogut guardar el PALIC: " + (e.message || e.code || ''));
  }
}

// SD

async function guardarSDAssignacions(professor, assignacions) {
  if (departamentTancat.value) return;
  const normalitzades = normalitzarSDAssignacions(assignacions);
  try {
    await updateDoc(cursStore.docRef('professors', professor.id), {
      sdAssignacions: normalitzades,
      sdAssignades: normalitzades.length,
      lastModified: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error actualitzant SD:', e);
    toast.error("No s'ha pogut guardar el suport divisible: " + (e.message || e.code || ''));
  }
}

async function incrementarSD(professor) {
  if (departamentTancat.value) return;
  if (totalSDAssignades.value >= totalSDDepartament.value) return;
  const assignacions = [
    ...normalitzarSDAssignacions(professor.sdAssignacions, professor.sdAssignades),
    crearSDAssignacio(),
  ];
  await guardarSDAssignacions(professor, assignacions);
}

async function decrementarSD({ professor, index }) {
  if (departamentTancat.value) return;
  const assignacions = normalitzarSDAssignacions(professor.sdAssignacions, professor.sdAssignades);
  if (!assignacions.length) return;
  const indexEliminar = Number.isInteger(index) ? index : assignacions.length - 1;
  assignacions.splice(indexEliminar, 1);
  await guardarSDAssignacions(professor, assignacions);
}

async function actualitzarSDGrup({ professor, index, grup }) {
  if (departamentTancat.value) return;
  const assignacions = normalitzarSDAssignacions(professor.sdAssignacions, professor.sdAssignades);
  if (!assignacions[index]) return;
  assignacions[index] = {
    ...assignacions[index],
    grup: (grup || '').toString().trim(),
  };
  await guardarSDAssignacions(professor, assignacions);
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
    toast.error("No s'ha pogut desar les dades del professor: " + (e.message || e.code || ''));
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
  } catch (e) {
    console.error('Error actualitzant participants de coordinació:', e);
    toast.error("No s'ha pogut actualitzar la coordinació: " + (e.message || e.code || ''));
  }
}

async function desassignarClasseProfessor({ professor, classe }) {
  if (departamentTancat.value) return;
  try {
    const actualitzacions = crearActualitzacionsDesassignacioProfessor({
      classe,
      classes: classes.value,
      nomProfessor: professor.nom,
    });

    const batch = writeBatch(db);
    for (const actualitzacio of actualitzacions) {
      batch.update(cursStore.docRef('classes', actualitzacio.classe.id), {
        professors: [...actualitzacio.professors],
        professorAssignat: actualitzacio.professorAssignat,
        lastModified: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (e) {
    console.error('Error desassignant classe:', e);
    toast.error('Error al desassignar. Torna-ho a intentar.');
  }
}

async function autoAssignarDepartamentUnipersonal(key) {
  if (!key || autoAssignacionsEnCurs.value.has(key)) return;
  if (departamentTancat.value || solsLectura.value) return;
  if (professorsDepartament.value.length !== 1) return;

  const professor = professorsDepartament.value[0];
  const pendents = classesAutoAssignablesDepartament.value;
  if (!professor?.nom || !pendents.length) return;

  autoAssignacionsEnCurs.value.add(key);
  try {
    const perClasse = new Map();
    pendents.forEach((classe) => {
      for (const actualitzacio of crearActualitzacionsAssignacio({
        classe,
        classes: classes.value,
        professors: [professor.nom],
      })) {
        perClasse.set(actualitzacio.classe.id, actualitzacio);
      }
    });

    const batch = writeBatch(db);
    for (const actualitzacio of perClasse.values()) {
      batch.update(cursStore.docRef('classes', actualitzacio.classe.id), {
        professors: [...actualitzacio.professors],
        professorAssignat: actualitzacio.professorAssignat,
        lastModified: serverTimestamp(),
      });
    }
    await batch.commit();
    toast.ok(`Repartiment automàtic: ${pendents.length} classes assignades a ${professor.nom}.`);
  } catch (e) {
    console.error('Error en el repartiment automàtic:', e);
    toast.error("No s'ha pogut fer el repartiment automàtic.");
  } finally {
    autoAssignacionsEnCurs.value.delete(key);
  }
}

watch(
  autoAssignacioKey,
  (key) => {
    if (!key) return;
    autoAssignarDepartamentUnipersonal(key);
  },
  { immediate: true }
);

function handleAssignacionsActualitzades() {}

async function tancarDepartament() {
  if (!departamentSeleccionat.value || departamentTancat.value || !departamentActual.value?.id) return;
  if (validacioDepartament.value.critiques.length > 0) {
    toast.error(
      `No es pot tancar ${departamentSeleccionat.value}: `
      + `${validacioDepartament.value.critiques.length} incidències crítiques pendents.`
    );
    await anarAProblema(validacioDepartament.value.critiques[0]);
    return;
  }

  if (validacioDepartament.value.avisos.length > 0) {
    const revisar = confirm(
      `${departamentSeleccionat.value} té ${validacioDepartament.value.avisos.length} avisos. `
      + 'Vols tancar igualment la distribució?'
    );
    if (!revisar) return;
  }

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
    toast.error("No s'ha pogut tancar el departament. Revisa els permisos.");
  }
}

// Print

function imprimirFulla() {
  activeTab.value = 'fulla';
  setTimeout(() => window.print(), 150);
}

// Lifecycle

watch(departamentSeleccionat, (newDept) => {
  if (newDept) {
    transicioPantallaDepartament.value = 'departament-slide-forward';
    mostrarSelectorDepartaments.value = false;
    activeTab.value = 'distribucio';
    mostrarValidacioDistribucio.value = false;
  } else {
    mostrarSelectorDepartaments.value = true;
  }
});
</script>

<style scoped>
.departament-screen {
  min-width: 0;
}

.department-loading-card {
  min-height: 7rem;
}

.department-loading-mark {
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, var(--pastel-blue-bg), var(--pastel-orange-bg)),
    var(--surface-soft);
  border: 1px solid var(--border-soft);
  box-shadow: var(--card-shadow-soft);
  position: relative;
  overflow: hidden;
}

.department-loading-mark::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.62), transparent);
  animation: department-loading-sheen 1.15s ease-in-out infinite;
  transform: translateX(-100%);
}

.department-sticky-bar {
  border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border-soft));
  border-radius: 0.625rem;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--surface) 86%, var(--pastel-blue-bg)), var(--surface)),
    var(--surface);
  color: var(--text-main);
  box-shadow: var(--card-shadow-soft);
}

.validation-panel-critical {
  border-color: color-mix(in srgb, #fb7185 42%, var(--border-soft));
  background:
    linear-gradient(180deg, rgb(255 241 242 / 0.72), var(--surface)),
    var(--surface);
}

.validation-panel-warning {
  border-color: color-mix(in srgb, #fbbf24 42%, var(--border-soft));
  background:
    linear-gradient(180deg, rgb(255 251 235 / 0.78), var(--surface)),
    var(--surface);
}

.validation-issue-card {
  box-shadow: 0 8px 20px rgb(15 23 42 / 0.05);
}

:global(.validation-target-highlight) {
  outline: 3px solid color-mix(in srgb, var(--primary) 68%, white);
  outline-offset: 3px;
  box-shadow: 0 0 0 7px color-mix(in srgb, var(--primary) 18%, transparent), var(--card-shadow-soft);
  transition: outline-color 160ms ease, box-shadow 160ms ease;
}

.department-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

.department-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem;
}

.department-tab {
  min-height: 2.5rem;
  min-width: 0;
  padding-inline: 0.55rem;
  text-align: center;
  white-space: normal;
  line-height: 1.15;
}

@keyframes department-loading-sheen {
  to {
    transform: translateX(100%);
  }
}

@media (min-width: 640px) {
  .department-actions {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .department-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .department-tab {
    white-space: nowrap;
  }
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
  .department-loading-mark::after {
    animation: none;
  }

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
