<template>
  <div class="min-h-screen bg-slate-100 text-slate-950">
    <a href="#main-content" class="skip-link">Saltar al contingut</a>
    <nav class="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
          <router-link to="/" class="flex shrink-0 items-center gap-3">
            <img
              src="/logo_IESJSB_nav.png"
              alt="IES Josep Sureda i Blanes"
              class="h-9 w-auto object-contain"
            />
            <div class="hidden sm:block">
              <h1 class="text-base font-semibold leading-tight text-slate-950">QUOTA</h1>
              <p class="text-xs font-medium text-slate-600">IES Josep Sureda i Blanes</p>
            </div>
          </router-link>

          <div class="hidden flex-1 items-center justify-between gap-4 lg:flex">
            <div class="flex items-center gap-1 rounded-md bg-slate-100 p-1" aria-label="Navegació principal">
              <router-link
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                class="shrink-0 rounded px-3 py-1.5 text-sm font-semibold transition"
                :class="isActive(link.to)
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-950'"
              >
                {{ link.label }}
              </router-link>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <select
                v-if="authStore.estaAutenticat && cursStore.cursos.length"
                :value="cursStore.cursActiuId"
                @change="cursStore.canviarCursActiu($event.target.value)"
                class="rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none"
              >
                <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id">
                  {{ c.nom || c.id }}{{ c.bloqueig ? ' (bloquejat)' : '' }}
                </option>
              </select>

              <span
                v-if="authStore.estaAutenticat"
                class="max-w-[13rem] truncate border-l border-slate-200 pl-3 text-sm font-medium text-slate-700"
              >
                {{ authStore.usuari || authStore.email || authStore.rol }}
              </span>

              <button
                v-if="authStore.estaAutenticat"
                type="button"
                @click="tancarSessio"
                class="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Sortir
              </button>
            </div>
          </div>

          <button
            type="button"
            class="rounded-md p-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
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

        <div v-if="mobileMenuOpen" class="border-t border-slate-200 pb-4 pt-2 lg:hidden">
          <div class="space-y-0.5" role="menu" aria-label="Navegació principal">
            <router-link
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              role="menuitem"
              class="flex items-center rounded-md px-3 py-3 text-sm font-semibold transition"
              :class="isActive(link.to)
                ? 'bg-primary/10 text-primary'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'"
              @click="mobileMenuOpen = false"
            >
              {{ link.label }}
            </router-link>
          </div>

          <div class="mt-3 space-y-3 border-t border-slate-200 px-1 pt-3">
            <select
              v-if="authStore.estaAutenticat && cursStore.cursos.length"
              :value="cursStore.cursActiuId"
              @change="cursStore.canviarCursActiu($event.target.value)"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none"
            >
              <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id">
                {{ c.nom || c.id }}{{ c.bloqueig ? ' (bloquejat)' : '' }}
              </option>
            </select>

            <div v-if="authStore.estaAutenticat" class="flex items-center justify-between gap-3">
              <span class="truncate text-sm font-medium text-slate-700">
                {{ authStore.usuari || authStore.email || authStore.rol }}
              </span>
              <button
                type="button"
                @click="tancarSessio"
                class="shrink-0 rounded-md border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Sortir
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="h-0.5 bg-primary"></div>
    </nav>

    <main id="main-content" :class="mainClass">
      <div
        v-if="esperantCurs"
        class="card p-8 text-center text-sm font-medium text-slate-700"
      >
        Carregant el curs actiu...
      </div>
      <div
        v-else-if="senseCurs"
        class="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-sm font-medium text-amber-900 shadow-sm"
      >
        No hi ha cap curs actiu. Ves a Administració > Curs acadèmic per crear o seleccionar un curs.
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

const mainClass = computed(() =>
  route.path === '/'
    ? 'min-h-[calc(100vh-4.125rem)]'
    : 'mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8'
);

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
