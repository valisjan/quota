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
            class="admin-nav-item"
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

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const tabs = [
  {
    path: '/admin/cursos',
    nom: 'Cursos',
    color: '#0024B6',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    help: 'Anys acadèmics',
    descripcio: 'Crea cursos nous, bloqueja els tancats i canvia el curs actiu.',
  },
  {
    path: '/admin/sincronitzacio',
    nom: 'Sincronització',
    color: '#00BF33',
    icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
    help: 'Google Sheets',
    descripcio: 'Importa classes, professorat i departaments des del full de càlcul.',
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
    path: '/admin/configuracio',
    nom: 'Configuració',
    color: '#0024B6',
    icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.36.78.757.943.097.04.193.08.287.126.38.184.828.139 1.17-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.247.342-.292.79-.108 1.17.046.094.086.19.126.287.163.397.519.687.943.757l.894.149c.542.09.94.56.94 1.11v1.093c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.78.36-.943.757-.04.097-.08.193-.126.287-.184.38-.139.828.108 1.17l.527.737c.32.448.27 1.061-.12 1.45l-.773.774a1.125 1.125 0 0 1-1.45.12l-.737-.527c-.342-.247-.79-.292-1.17-.108a6.52 6.52 0 0 1-.287.126c-.397.163-.687.519-.757.943l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.149-.894c-.07-.424-.36-.78-.757-.943a6.52 6.52 0 0 1-.287-.126c-.38-.184-.828-.139-1.17.108l-.737.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.247-.342.292-.79.108-1.17a6.52 6.52 0 0 1-.126-.287c-.163-.397-.519-.687-.943-.757l-.894-.149a1.125 1.125 0 0 1-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.78-.36.943-.757.04-.097.08-.193.126-.287.184-.38.139-.828-.108-1.17l-.527-.737a1.125 1.125 0 0 1 .12-1.45l.773-.774a1.125 1.125 0 0 1 1.45-.12l.737.527c.342.247.79.292 1.17.108.094-.046.19-.086.287-.126.397-.163.687-.519.757-.943l.149-.894ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    help: 'Paràmetres',
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

async function tancarSessio() {
  await authStore.tancarSessio();
  router.push('/');
}
</script>
