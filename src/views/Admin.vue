<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-sidebar-body">
        <div class="admin-brand">
          <div class="admin-brand-mark">
            <img src="/logo_IESJSB_nav.png" alt="" class="h-8 w-auto object-contain" />
          </div>
          <div class="hidden lg:block">
            <p class="admin-kicker">IES Sureda</p>
            <h1 class="admin-title">Quota</h1>
          </div>
        </div>

        <nav class="admin-nav" aria-label="Administració de Quota">
          <template v-for="grup in navegacioAdmin" :key="grup.titol">
            <p class="admin-nav-grup hidden lg:block">{{ grup.titol }}</p>
            <button
              v-for="tab in grup.tabs"
              :key="tab.path"
              type="button"
              class="admin-nav-item relative"
              :class="{
                'admin-nav-item-active': isActive(tab),
                'admin-nav-item-warning': tab.estat === 'warning',
              }"
              :title="tab.nom"
              @click="anarAdmin(tab.path)"
            >
              <span v-if="tab.pas" class="admin-nav-number">{{ tab.pas }}</span>
              <span class="admin-nav-icon">
                <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
                </svg>
              </span>
              <span class="min-w-0 hidden lg:block lg:flex-1">
                <span class="admin-nav-label">{{ tab.nom }}</span>
                <span class="admin-nav-help">{{ tab.help }}</span>
              </span>
              <span v-if="tab.badge" class="admin-nav-badge hidden lg:inline-flex" :class="tab.badgeClass">
                {{ tab.badge }}
              </span>
            </button>
          </template>
        </nav>

        <!-- Compact user area visible only on mobile -->
        <div class="flex shrink-0 items-center gap-2 lg:hidden">
          <div class="admin-user-avatar h-8 w-8 text-sm">
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
          <p class="truncate text-sm font-bold">
            {{ authStore.usuari || authStore.email || 'Usuari' }}
          </p>
          <p class="truncate text-xs font-semibold">Administració</p>
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
      <header class="admin-commandbar">
        <div>
          <p class="text-sm font-medium text-slate-600">
            Administració
          </p>
          <h2 class="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {{ pestanyaActual?.nom || 'Quota' }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ pestanyaActual?.descripcio || '' }}
          </p>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCursStore } from '../stores/curs';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { exclosaDelRepartiment, esCoordinacio } from '../utils/tipus';
import { formatDecimal } from '../utils/quota';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cursStore = useCursStore();

// ─── Xifres per a les etiquetes del menú ───────────────────────────────────────

const { items: classesLive } = useCursCollectionSnapshot({ colName: 'classes' });

const horesQuota = computed(() => classesLive.value.reduce((suma, classe) => suma + (Number(classe.hores) || 0), 0));
const classesAssignables = computed(() =>
  classesLive.value.filter((c) => !exclosaDelRepartiment(c.tipus) && !esCoordinacio(c.tipus))
);
const classesSenseAssignar = computed(() =>
  classesAssignables.value.filter((c) => !c.professorAssignat && !c.professors?.length).length
);
const percentAssignat = computed(() => {
  const total = classesAssignables.value.length;
  if (!total) return null;
  return Math.round(((total - classesSenseAssignar.value) / total) * 100);
});

// ─── Apartats: el cicle del curs (en l'ordre en què es fa) i la resta ──────────

const CICLE = [
  {
    path: '/admin/cursos',
    nom: 'Curs',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    help: 'Curs actiu, curs nou i estat del cicle.',
    descripcio: 'Crea el curs nou a partir de l\'anterior, tria el curs actiu i segueix en quin punt és cada fase.',
  },
  {
    path: '/admin/professorat',
    nom: 'Professorat',
    icon: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z',
    help: 'Fitxes, rols i accessos.',
    descripcio: 'Altes, canvis, substitucions i baixes del professorat, amb els rols i qui pot entrar a les aplicacions.',
    aliases: ['/admin/professors', '/admin/usuaris'],
  },
  {
    path: '/admin/quota',
    nom: 'Quota',
    icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
    help: 'Classes i hores de cada departament.',
    descripcio: 'Les classes de cada departament amb les hores i el tipus, i el balanç amb el professorat.',
    aliases: ['/admin/dades', '/admin/classes', '/admin/departaments'],
  },
  {
    path: '/departament',
    nom: 'Repartiment',
    icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z',
    help: 'Els departaments reparteixen les hores.',
    descripcio: 'Caps de departament assignen les hores entre el professorat.',
  },
  {
    path: '/admin/untis',
    nom: 'Untis',
    icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
    help: 'Fitxers per importar el repartiment.',
    descripcio: 'Prepara, revisa i descarrega els fitxers per importar el repartiment a Untis.',
  },
];

const ALTRES = [
  {
    path: '/informes',
    nom: 'Informes',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 9.75 19.875V8.625ZM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
    help: 'Seguiment, validació i resums.',
  },
  {
    path: '/admin/parametres',
    nom: 'Paràmetres',
    icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.36.78.757.943.097.04.193.08.287.126.38.184.828.139 1.17-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.247.342-.292.79-.108 1.17.046.094.086.19.126.287.163.397.519.687.943.757l.894.149c.542.09.94.56.94 1.11v1.093c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.78.36-.943.757-.04.097-.08.193-.126.287-.184.38-.139.828.108 1.17l.527.737c.32.448.27 1.061-.12 1.45l-.773.774a1.125 1.125 0 0 1-1.45.12l-.737-.527c-.342-.247-.79-.292-1.17-.108a6.52 6.52 0 0 1-.287.126c-.397.163-.687.519-.757.943l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.149-.894c-.07-.424-.36-.78-.757-.943a6.52 6.52 0 0 1-.287-.126c-.38-.184-.828-.139-1.17.108l-.737.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.247-.342.292-.79.108-1.17a6.52 6.52 0 0 1-.126-.287c-.163-.397-.519-.687-.943-.757l-.894-.149a1.125 1.125 0 0 1-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.78-.36.943-.757.04-.097.08-.193.126-.287.184-.38.139-.828-.108-1.17l-.527-.737a1.125 1.125 0 0 1 .12-1.45l.773-.774a1.125 1.125 0 0 1 1.45-.12l.737.527c.342.247.79.292 1.17.108.094-.046.19-.086.287-.126.397-.163.687-.519.757-.943l.149-.894ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    help: 'Guàrdies i regles del repartiment.',
    descripcio: 'Configura les guàrdies de pati per departament i les guàrdies del professorat.',
  },
];

const tabs = [...CICLE, ...ALTRES];
const pestanyaActual = computed(() => tabs.find((tab) => isActive(tab)) || null);

const navegacioAdmin = computed(() => {
  const pct = percentAssignat.value;
  const sense = classesSenseAssignar.value;
  const etiquetes = {
    '/admin/cursos': cursStore.cursActiuId
      ? { badge: cursStore.cursActiu?.nom || cursStore.cursActiuId, badgeClass: 'admin-nav-badge-ok' }
      : { badge: 'Pendent', badgeClass: 'admin-nav-badge-warning', estat: 'warning' },
    '/admin/quota': classesLive.value.length
      ? { badge: `${formatDecimal(horesQuota.value)} h`, badgeClass: 'admin-nav-badge-info' }
      : { badge: 'Buida', badgeClass: 'admin-nav-badge-muted' },
    '/departament': pct === null
      ? { badge: 'Sense dades', badgeClass: 'admin-nav-badge-muted' }
      : pct === 100
        ? { badge: 'Complet', badgeClass: 'admin-nav-badge-ok' }
        : { badge: `${pct}%`, badgeClass: pct >= 80 ? 'admin-nav-badge-info' : 'admin-nav-badge-warning', estat: 'warning' },
    '/admin/untis': sense === 0
      ? { badge: 'Llest', badgeClass: pct === 100 ? 'admin-nav-badge-ok' : 'admin-nav-badge-muted' }
      : { badge: `${sense} pend.`, badgeClass: 'admin-nav-badge-warning' },
  };
  const amb = (tab, pas) => ({ ...tab, pas, ...(etiquetes[tab.path] || {}) });
  return [
    { titol: 'Cicle del curs', tabs: CICLE.map((tab, index) => amb(tab, index + 1)) },
    { titol: 'Altres', tabs: ALTRES.map((tab) => amb(tab, 0)) },
  ];
});

const inicialUsuari = computed(() =>
  (authStore.usuari || authStore.email || authStore.rolActiu || 'U').toString().trim().charAt(0).toUpperCase()
);

function isActive(tab) {
  return route.path === tab.path || tab.aliases?.includes(route.path);
}

function anarAdmin(path) {
  if (!path || route.path === path) return;
  router.push(path);
}

async function tancarSessio() {
  await authStore.tancarSessio();
  router.push('/');
}
</script>
