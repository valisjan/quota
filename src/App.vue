<template>
  <div class="min-h-screen bg-[#eef2f7] text-slate-900">
    <a href="#main-content" class="skip-link">Saltar al contingut</a>
    <nav class="sticky top-0 z-50 bg-[#0024B6] shadow-md">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <!-- Barra principal -->
        <div class="flex h-16 items-center justify-between">

          <!-- Logo -->
          <router-link to="/" class="flex shrink-0 items-center gap-3">
            <img
              src="/logo_IESJSB_nav.png"
              alt="IES Josep Sureda i Blanes"
              class="h-9 w-auto object-contain brightness-0 invert"
            />
            <div>
              <h1 class="text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">QUOTA</h1>
              <p class="hidden text-xs font-medium text-blue-200 sm:block">IES Josep Sureda i Blanes</p>
            </div>
          </router-link>

          <!-- Nav completa: desktop (lg+) -->
          <div class="hidden flex-1 items-center justify-between gap-4 lg:flex">
            <div class="flex items-center gap-1" aria-label="Navegació principal">
              <router-link
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                class="shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition"
                :class="isActive(link.to)
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'"
              >
                {{ link.label }}
              </router-link>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <select
                v-if="authStore.estaAutenticat && cursStore.cursos.length"
                :value="cursStore.cursActiuId"
                @change="cursStore.canviarCursActiu($event.target.value)"
                class="rounded-md border border-white/30 bg-white/15 py-1 pl-2 pr-6 text-sm font-semibold text-white focus:outline-none"
              >
                <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id" class="bg-[#0024B6] text-white">
                  {{ c.nom || c.id }}{{ c.bloqueig ? ' 🔒' : '' }}
                </option>
              </select>
              <span
                v-if="authStore.estaAutenticat"
                class="max-w-[13rem] truncate border-l border-white/30 pl-3 text-sm font-medium text-blue-100"
              >
                {{ authStore.usuari || authStore.email || authStore.rol }}
              </span>
              <button
                v-if="authStore.estaAutenticat"
                type="button"
                @click="tancarSessio"
                class="rounded-md px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                Sortir
              </button>
            </div>
          </div>

          <!-- Hamburger: mòbil i tablet (< lg) -->
          <button
            type="button"
            class="rounded-md p-2 text-blue-100 transition hover:bg-white/10 hover:text-white lg:hidden"
            :aria-expanded="mobileMenuOpen"
            aria-label="Obrir menú"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg v-if="!mobileMenuOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

        </div>

        <!-- Menú desplegable (< lg) -->
        <div v-if="mobileMenuOpen" class="border-t border-white/20 pb-4 pt-2 lg:hidden">

          <!-- Links de navegació -->
          <div class="space-y-0.5" role="menu" aria-label="Navegació principal">
            <router-link
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              role="menuitem"
              class="flex items-center rounded-md px-3 py-3 text-sm font-semibold transition"
              :class="isActive(link.to)
                ? 'bg-white/20 text-white'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'"
              @click="mobileMenuOpen = false"
            >
              {{ link.label }}
            </router-link>
          </div>

          <!-- Peu del menú: curs + usuari + sortir -->
          <div class="mt-3 border-t border-white/20 pt-3 space-y-3 px-1">
            <select
              v-if="authStore.estaAutenticat && cursStore.cursos.length"
              :value="cursStore.cursActiuId"
              @change="cursStore.canviarCursActiu($event.target.value)"
              class="w-full rounded-md border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold text-white focus:outline-none"
            >
              <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id" class="bg-[#0024B6] text-white">
                {{ c.nom || c.id }}{{ c.bloqueig ? ' 🔒' : '' }}
              </option>
            </select>

            <div v-if="authStore.estaAutenticat" class="flex items-center justify-between gap-3">
              <span class="truncate text-sm font-medium text-blue-200">
                {{ authStore.usuari || authStore.email || authStore.rol }}
              </span>
              <button
                type="button"
                @click="tancarSessio"
                class="shrink-0 rounded-md border border-white/30 px-4 py-1.5 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                Sortir
              </button>
            </div>
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
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCursStore } from './stores/curs';
import ToastContainer from './components/ToastContainer.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cursStore = useCursStore();
const mobileMenuOpen = ref(false);

const links = [
  { to: '/', label: 'Inici' },
  { to: '/admin', label: 'Administració' },
  { to: '/departament', label: 'Departaments' },
  { to: '/resums', label: 'Resums' },
];

function isActive(to) {
  return route.path === to || (to !== '/' && route.path.startsWith(`${to}/`));
}

watch(() => route.path, () => { mobileMenuOpen.value = false; });

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
