<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-sidebar-body">
        <div class="admin-brand">
          <div class="admin-brand-mark">Q</div>
          <div class="hidden lg:block">
            <p class="admin-kicker">IES Sureda</p>
            <h1 class="admin-title">Quota</h1>
          </div>
        </div>

        <nav class="admin-nav">
          <router-link
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            class="admin-nav-item relative"
            :class="{ 'admin-nav-item-active': isActive(tab) }"
            :style="isActive(tab) ? { '--section-color': tab.color } : null"
            :title="tab.nom"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
            </svg>
            <span class="min-w-0 hidden lg:block">
              <span class="admin-nav-label">{{ tab.nom }}</span>
              <span class="admin-nav-help">{{ tab.help }}</span>
            </span>
            <span
              v-if="tab.path === '/admin/dades' && mostrarAvisDesactualitzat"
              class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-slate-950 lg:right-3 lg:top-3"
              title="Canvis pendents a Google Sheets"
              aria-hidden="true"
            ></span>
          </router-link>
        </nav>

        <!-- Compact user area visible only on mobile -->
        <div class="flex shrink-0 items-center gap-2 lg:hidden">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/20 text-sm font-semibold text-white">
            {{ inicialUsuari }}
          </div>
          <button type="button" class="admin-logout" @click="tancarSessio">Sortir</button>
        </div>
      </div>

      <!-- Full user card visible only on desktop -->
      <div class="admin-user-card hidden lg:flex">
        <div class="admin-user-avatar">
          {{ inicialUsuari }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-white">
            {{ authStore.usuari || authStore.email || 'Usuari' }}
          </p>
          <p class="truncate text-xs font-semibold text-white/70">{{ etiquetaRol }}</p>
        </div>
        <button
          type="button"
          class="admin-logout"
          @click="tancarSessio"
          title="Sortir"
        >
          Sortir
        </button>
      </div>
    </aside>

    <section class="admin-workspace">
      <header class="admin-commandbar" :style="{ borderTop: '4px solid ' + colorActual }">
        <div>
          <p class="text-sm font-medium text-slate-500">
            Administració
          </p>
          <h2 class="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {{ pestanyaActual?.nom || 'Centre de control' }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ pestanyaActual?.descripcio || '' }}
          </p>
        </div>

      </header>

      <section
        v-if="mostrarAvisDesactualitzat"
        role="status"
        aria-live="polite"
        class="sticky top-[5rem] z-40 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-lg font-black text-amber-800">
              !
            </div>
            <div class="min-w-0">
              <p class="font-semibold">{{ titolAvisActualitzacio }}</p>
              <p class="mt-0.5 text-sm font-medium text-amber-900">
                {{ detallAvisActualitzacio }}
              </p>
              <ul
                v-if="detallsAvisActualitzacio.length"
                class="mt-2 space-y-1 text-sm text-amber-950"
              >
                <li
                  v-for="(canvi, index) in detallsAvisActualitzacio"
                  :key="`${canvi.tipus}-${index}-${canvi.resum}`"
                  class="rounded-md border border-amber-200/80 bg-white/70 px-2.5 py-1.5"
                >
                  <span
                    class="mr-2 inline-flex rounded px-1.5 py-0.5 text-xs font-bold"
                    :class="classeCanviAvis(canvi.tipus)"
                  >
                    {{ etiquetaCanviAvis(canvi.tipus) }}
                  </span>
                  <span class="font-semibold">{{ canvi.resum }}</span>
                  <span v-if="canvi.detall" class="mt-0.5 block text-xs font-medium text-amber-800">
                    {{ canvi.detall }}
                  </span>
                </li>
              </ul>
              <p v-if="ultimaSyncSheets" class="mt-1 text-xs font-medium text-amber-800">
                Última sincronització: {{ formatDataHora(ultimaSyncSheets) }}.
              </p>
            </div>
          </div>
          <router-link
            v-if="mostrarBotoAvisSincronitzar"
            to="/admin/dades"
            class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-[#0024B6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#001A8A]"
          >
            Ves a sincronització
          </router-link>
        </div>
      </section>

      <main class="admin-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettings';
import {
  comprovarEstatActualitzacioSheets,
  subscribeEstatSincronitzacio,
} from '../services/sincronitzacio.js';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cursStore = useCursStore();

const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_DELAY_MS = 900;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown'];

const settings = ref({ ...DEFAULT_APP_SETTINGS });
const syncState = ref(null);
const estatActualitzacio = ref('idle');
const actualitzacioSheets = ref(null);
const errorActualitzacio = ref('');
const settingsReady = ref(false);

let settingsUnsubscribe = null;
let syncStateUnsubscribe = null;
let activityTimer = null;
let lastCheckAt = 0;
let checkPromise = null;

const tabs = [
  {
    path: '/admin/cursos',
    nom: 'Curs acadèmic',
    color: '#0024B6',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    help: 'Curs actiu',
    descripcio: 'Crea cursos acadèmics, bloqueja els tancats i canvia el curs actiu.',
  },
  {
    path: '/admin/dades',
    nom: 'Dades importades',
    color: '#0024B6',
    icon: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    help: 'Consulta segura',
    descripcio: 'Revisa les dades importades sense editar la font original.',
    aliases: ['/admin/classes', '/admin/professors', '/admin/departaments'],
  },
  {
    path: '/admin/tancament',
    nom: 'Tancament',
    color: '#FF8040',
    icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
    help: 'Bloquejos',
    descripcio: 'Controla quan els departaments queden tancats o desbloquejats.',
  },
  {
    path: '/admin/parametres',
    nom: 'Paràmetres',
    color: '#0024B6',
    icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.36.78.757.943.097.04.193.08.287.126.38.184.828.139 1.17-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.247.342-.292.79-.108 1.17.046.094.086.19.126.287.163.397.519.687.943.757l.894.149c.542.09.94.56.94 1.11v1.093c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.78.36-.943.757-.04.097-.08.193-.126.287-.184.38-.139.828.108 1.17l.527.737c.32.448.27 1.061-.12 1.45l-.773.774a1.125 1.125 0 0 1-1.45.12l-.737-.527c-.342-.247-.79-.292-1.17-.108a6.52 6.52 0 0 1-.287.126c-.397.163-.687.519-.757.943l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.149-.894c-.07-.424-.36-.78-.757-.943a6.52 6.52 0 0 1-.287-.126c-.38-.184-.828-.139-1.17.108l-.737.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.247-.342.292-.79.108-1.17a6.52 6.52 0 0 1-.126-.287c-.163-.397-.519-.687-.943-.757l-.894-.149a1.125 1.125 0 0 1-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.78-.36.943-.757.04-.097.08-.193.126-.287.184-.38.139-.828-.108-1.17l-.527-.737a1.125 1.125 0 0 1 .12-1.45l.773-.774a1.125 1.125 0 0 1 1.45-.12l.737.527c.342.247.79.292 1.17.108.094-.046.19-.086.287-.126.397-.163.687-.519.757-.943l.149-.894ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    help: 'Repartiment',
    descripcio: 'Configura paràmetres generals del repartiment del curs.',
  },
  {
    path: '/admin/untis',
    nom: 'Untis',
    color: '#00BF33',
    icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
    help: 'Exportació',
    descripcio: 'Prepara i revisa fitxers per importar les assignacions a Untis.',
  },
  {
    path: '/admin/usuaris',
    nom: 'Usuaris',
    color: '#0024B6',
    icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
    help: 'Accessos',
    descripcio: 'Gestiona rols i permisos dels comptes Google autoritzats.',
  },
];

const pestanyaActual = computed(() => tabs.find((tab) => isActive(tab)) || tabs[0]);
const colorActual = computed(() => pestanyaActual.value?.color || '#0024B6');
const mostrarAvisDesactualitzat = computed(() => actualitzacioSheets.value?.desactualitzat === true);
const mostrarBotoAvisSincronitzar = computed(() =>
  mostrarAvisDesactualitzat.value && route.path !== '/admin/dades'
);
const ultimaSyncSheets = computed(() => actualitzacioSheets.value?.ultimaSync || syncState.value?.syncedAt || '');
const titolAvisActualitzacio = computed(() =>
  actualitzacioSheets.value?.senseReferencia ? 'Cal sincronitzar Google Sheets' : 'Canvis pendents a Google Sheets'
);
const detallAvisActualitzacio = computed(() => {
  if (actualitzacioSheets.value?.senseReferencia) {
    return "Encara no hi ha una referència de sincronització per a aquest curs. Sincronitza una vegada per activar l'avís automàtic.";
  }
  if (actualitzacioSheets.value?.origenCanviat) {
    return 'Ha canviat el full de Google Sheets configurat. Cal sincronitzar abans de continuar.';
  }
  const classes = actualitzacioSheets.value?.totalClasses ?? 0;
  const canvis = actualitzacioSheets.value?.canvisClasses;
  if (canvis?.totalCanvis) {
    const verb = canvis.totalCanvis === 1 ? "S'ha detectat" : "S'han detectat";
    const total = canvis.totalCanvis === 1 ? '1 canvi' : `${canvis.totalCanvis} canvis`;
    return `${verb} ${total} a Classes: ${resumRecompteCanvis(canvis)}.`;
  }
  return `Google Sheets té canvis pendents a Classes (${classes} files). Sincronitza abans de repartir o exportar.`;
});

const detallsAvisActualitzacio = computed(() => {
  const canvis = actualitzacioSheets.value?.canvisClasses;
  if (!canvis?.detalls?.length || canvis.totalCanvis >= 10) return [];
  return canvis.detalls;
});

const etiquetaRol = computed(() => {
  const etiquetes = {
    admin: 'Administració',
    cap_departament: 'Cap de departament',
    departament: 'Cap de departament',
    professor: 'Professorat',
  };
  return etiquetes[authStore.rol] || authStore.rol || 'Sense rol';
});

const inicialUsuari = computed(() =>
  (authStore.usuari || authStore.email || authStore.rol || 'U').toString().trim().charAt(0).toUpperCase()
);

function isActive(tab) {
  return route.path === tab.path || tab.aliases?.includes(route.path);
}

function formatDataHora(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resumRecompteCanvis(canvis) {
  const parts = [];
  if (canvis.noves) parts.push(`${canvis.noves} ${canvis.noves === 1 ? 'nova' : 'noves'}`);
  if (canvis.modificades) parts.push(`${canvis.modificades} ${canvis.modificades === 1 ? 'modificada' : 'modificades'}`);
  if (canvis.eliminades) parts.push(`${canvis.eliminades} ${canvis.eliminades === 1 ? 'eliminada' : 'eliminades'}`);
  return parts.join(', ') || '0 canvis';
}

function etiquetaCanviAvis(tipus) {
  const etiquetes = {
    nova: 'Nova',
    modificada: 'Modificada',
    eliminada: 'Eliminada',
  };
  return etiquetes[tipus] || 'Canvi';
}

function classeCanviAvis(tipus) {
  if (tipus === 'nova') return 'bg-green-100 text-green-800';
  if (tipus === 'eliminada') return 'bg-orange-100 text-orange-800';
  return 'bg-blue-100 text-blue-800';
}

function reconciliarAvisAmbEstatGuardat() {
  if (!actualitzacioSheets.value?.signaturaActual || !syncState.value?.classesSignature) return;
  const mateixOrigen =
    !syncState.value.sheetsId || syncState.value.sheetsId === (settings.value.sheetsId || DEFAULT_APP_SETTINGS.sheetsId);
  if (mateixOrigen && actualitzacioSheets.value.signaturaActual === syncState.value.classesSignature) {
    actualitzacioSheets.value = {
      ...actualitzacioSheets.value,
      desactualitzat: false,
      senseReferencia: false,
      ultimaSync: syncState.value.syncedAt || actualitzacioSheets.value.ultimaSync,
    };
    estatActualitzacio.value = 'ok';
  }
}

function marcarAvisComSincronitzat(estatGuardat) {
  if (!estatGuardat?.classesSignature) return;
  actualitzacioSheets.value = {
    ...(actualitzacioSheets.value || {}),
    desactualitzat: false,
    senseReferencia: false,
    origenCanviat: false,
    sheetsCanviat: false,
    signaturaActual: estatGuardat.classesSignature,
    signaturaGuardada: estatGuardat.classesSignature,
    sheetsId: estatGuardat.sheetsId || settings.value.sheetsId,
    sheetsIdGuardat: estatGuardat.sheetsId || settings.value.sheetsId,
    totalClasses: estatGuardat.totalClasses ?? actualitzacioSheets.value?.totalClasses ?? 0,
    totalProfessors: estatGuardat.totalProfessors ?? actualitzacioSheets.value?.totalProfessors ?? 0,
    ultimaSync: estatGuardat.syncedAt || actualitzacioSheets.value?.ultimaSync || '',
    checkedAt: estatGuardat.checkedAt || estatGuardat.syncedAt || new Date().toISOString(),
  };
  estatActualitzacio.value = 'ok';
  lastCheckAt = Date.now();
}

function programarComprovacio(delay = ACTIVITY_DELAY_MS, force = false) {
  if (!cursStore.cursActiuId) return;
  if (!settingsReady.value) return;
  if (typeof document !== 'undefined' && document.hidden && !force) return;
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    comprovarActualitzacioAutomatica({ force });
  }, delay);
}

async function comprovarActualitzacioAutomatica({ force = false } = {}) {
  if (!cursStore.cursActiuId) return null;
  if (!settingsReady.value) return null;

  const ara = Date.now();
  if (!force && ara - lastCheckAt < CHECK_INTERVAL_MS) return null;
  if (checkPromise && !force) return checkPromise;

  const cursIdComprovat = cursStore.cursActiuId;
  const sheetsIdComprovat = settings.value.sheetsId;
  lastCheckAt = ara;
  estatActualitzacio.value = 'comprovant';
  errorActualitzacio.value = '';

  const currentPromise = comprovarEstatActualitzacioSheets(cursIdComprovat, {
    sheetsId: sheetsIdComprovat,
  })
    .then((result) => {
      if (
        cursStore.cursActiuId !== cursIdComprovat ||
        settings.value.sheetsId !== sheetsIdComprovat
      ) {
        return null;
      }

      const estatGuardatActual = syncState.value;
      const mateixaSignatura =
        estatGuardatActual?.classesSignature
        && result.signaturaActual === estatGuardatActual.classesSignature
        && (!estatGuardatActual.sheetsId || estatGuardatActual.sheetsId === result.sheetsId);

      actualitzacioSheets.value = mateixaSignatura
        ? {
            ...result,
            desactualitzat: false,
            senseReferencia: false,
            ultimaSync: estatGuardatActual.syncedAt || result.ultimaSync,
          }
        : result;
      estatActualitzacio.value = actualitzacioSheets.value.desactualitzat ? 'desactualitzat' : 'ok';
      reconciliarAvisAmbEstatGuardat();
      return result;
    })
    .catch((error) => {
      errorActualitzacio.value = error.message || "No s'ha pogut comprovar Google Sheets.";
      estatActualitzacio.value = 'error';
      return null;
    })
    .finally(() => {
      if (checkPromise === currentPromise) checkPromise = null;
    });

  checkPromise = currentPromise;
  return checkPromise;
}

function registrarActivitatAdmin() {
  programarComprovacio();
}

function onVisibilityChange() {
  if (!document.hidden) programarComprovacio(0, true);
}

function setupAdminSubscriptions(cursId) {
  settingsUnsubscribe?.();
  syncStateUnsubscribe?.();
  settingsUnsubscribe = null;
  syncStateUnsubscribe = null;
  settings.value = { ...DEFAULT_APP_SETTINGS };
  syncState.value = null;
  actualitzacioSheets.value = null;
  settingsReady.value = false;
  lastCheckAt = 0;

  if (!cursId) return;

  settingsUnsubscribe = subscribeAppSettings(cursId, (value) => {
    settings.value = value;
    settingsReady.value = true;
  });
  syncStateUnsubscribe = subscribeEstatSincronitzacio(cursId, (value) => {
    syncState.value = value;
    marcarAvisComSincronitzat(value);
  });
}

watch(() => cursStore.cursActiuId, setupAdminSubscriptions, { immediate: true });
watch(() => route.fullPath, () => programarComprovacio(0, true));

onMounted(() => {
  ACTIVITY_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, registrarActivitatAdmin, { capture: true, passive: true });
  });
  window.addEventListener('focus', registrarActivitatAdmin);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  clearTimeout(activityTimer);
  settingsUnsubscribe?.();
  syncStateUnsubscribe?.();
  ACTIVITY_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, registrarActivitatAdmin, true);
  });
  window.removeEventListener('focus', registrarActivitatAdmin);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

async function tancarSessio() {
  await authStore.tancarSessio();
  router.push('/');
}
</script>
