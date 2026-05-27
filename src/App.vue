<template>
  <div class="min-h-screen bg-[#eef2f7] text-slate-900">
    <a href="#main-content" class="skip-link">Saltar al contingut</a>
    <nav class="sticky top-0 z-50 bg-[#0024B6] shadow-md">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex min-h-16 flex-col gap-2 py-2 lg:min-h-[4.5rem] lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-0">

          <router-link to="/" class="flex min-w-0 items-center gap-3">
            <img
              src="/logo_IESJSB_nav.png"
              alt="IES Josep Sureda i Blanes"
              class="h-9 w-auto object-contain brightness-0 invert sm:h-10"
            />
            <div class="min-w-0">
              <h1 class="truncate text-xl font-bold tracking-tight text-white">
                QUOTA
              </h1>
              <p class="truncate text-xs font-medium text-blue-200">IES Josep Sureda i Blanes</p>
            </div>
          </router-link>

          <div class="flex max-w-full items-center gap-1 overflow-x-auto" aria-label="Navegacio principal">
            <router-link
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition"
              :class="route.path === link.to || route.path.startsWith(`${link.to}/`)
                ? 'bg-white/20 text-white'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'"
            >
              {{ link.label }}
            </router-link>
          </div>

          <div class="flex min-w-0 items-center gap-2">
            <select
              v-if="authStore.estaAutenticat && cursStore.cursos.length"
              :value="cursStore.cursActiuId"
              @change="cursStore.canviarCursActiu($event.target.value)"
              class="rounded-md border border-white/30 bg-white/15 py-1 pl-2 pr-6 text-sm font-semibold text-white focus:outline-none"
            >
              <option
                v-for="c in cursStore.cursos"
                :key="c.id"
                :value="c.id"
                class="bg-[#0024B6] text-white"
              >
                {{ c.nom || c.id }}{{ c.bloqueig ? ' 🔒' : '' }}
              </option>
            </select>
            <span
              v-if="authStore.estaAutenticat"
              class="max-w-[10rem] truncate border-l border-white/30 pl-3 text-sm font-medium text-blue-100 sm:max-w-[13rem]"
            >
              {{ authStore.usuari || authStore.email || authStore.rol }}
            </span>
            <button
              v-if="authStore.estaAutenticat"
              @click="tancarSessio"
              class="rounded-md px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
            >
              Sortir
            </button>
          </div>

        </div>
      </div>
      <div class="h-0.5 bg-gradient-to-r from-[#00BF33] via-white/20 to-[#FF8040]"></div>
    </nav>

    <main id="main-content" class="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div
        v-if="esperantCurs"
        class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-600 shadow-sm"
      >
        Carregant el curs actiu...
      </div>
      <div
        v-else-if="senseCurs"
        class="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-sm font-medium text-amber-900 shadow-sm"
      >
        No hi ha cap curs actiu. Ves a Administració > Cursos per crear o seleccionar un curs.
      </div>
      <router-view v-else />
    </main>

    <ToastContainer />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCursStore } from './stores/curs';
import ToastContainer from './components/ToastContainer.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cursStore = useCursStore();

const links = [
  { to: '/', label: 'Inici' },
  { to: '/admin', label: 'Administració' },
  { to: '/departament', label: 'Departaments' },
  { to: '/resums', label: 'Resums' },
];

const rutaSenseCurs = computed(() =>
  route.path === '/' || route.path === '/admin/cursos'
);
const rutaNecessitaCurs = computed(() =>
  authStore.estaAutenticat && !rutaSenseCurs.value
);
const esperantCurs = computed(() =>
  rutaNecessitaCurs.value && !cursStore.cursosReady
);
const senseCurs = computed(() =>
  rutaNecessitaCurs.value && cursStore.cursosReady && !cursStore.cursActiuId
);

function tancarSessio() {
  authStore.tancarSessio();
  router.push('/');
}

onMounted(() => {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('darkMode', 'false');
});
</script>
