<template>
  <div class="app-shell min-h-screen">
    <a href="#main-content" class="skip-link">Saltar al contingut</a>
    <nav class="app-nav sticky top-0 z-50 border-b shadow-sm backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
          <router-link to="/" class="flex shrink-0 items-center gap-3">
            <img
              src="/logo_IESJSB_nav.png"
              alt="IES Josep Sureda i Blanes"
              class="h-9 w-auto object-contain"
            />
            <div class="hidden sm:block">
              <h1 class="app-brand-title text-base font-semibold leading-tight">QUOTA</h1>
              <p class="app-brand-subtitle text-xs font-medium">IES Josep Sureda i Blanes</p>
            </div>
          </router-link>

          <div class="hidden flex-1 items-center justify-between gap-4 lg:flex">
            <div class="app-nav-tabs flex items-center gap-1 rounded-md p-1" aria-label="Navegació principal">
              <router-link
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                class="app-nav-link shrink-0 rounded px-3 py-1.5 text-sm font-semibold transition"
                :class="isActive(link.to)
                  ? 'app-nav-link-active shadow-sm'
                  : 'app-nav-link-idle'"
              >
                {{ link.label }}
              </router-link>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <select
                v-if="authStore.estaAutenticat && cursStore.cursos.length"
                :value="cursStore.cursActiuId"
                @change="cursStore.canviarCursActiu($event.target.value)"
                class="app-select rounded-md py-1.5 pl-2 pr-6 text-sm font-semibold shadow-sm focus:outline-none"
              >
                <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id">
                  {{ c.nom || c.id }}{{ c.bloqueig ? ' (bloquejat)' : '' }}
                </option>
              </select>

              <div
                v-if="authStore.esAdminReal()"
                class="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 shadow-sm"
                title="Canvia la vista sense perdre permisos reals d'administració"
              >
                <span class="hidden text-xs font-bold uppercase text-amber-800 xl:inline">Vista</span>
                <select
                  :value="vistaRolSeleccionada"
                  @change="canviarVistaRol($event.target.value)"
                  class="rounded border border-amber-200 bg-white px-2 py-1 text-xs font-bold text-amber-950 focus:outline-none"
                >
                  <option value="admin">Administració</option>
                  <option value="cap_departament">Cap de departament</option>
                  <option value="professor">Professor</option>
                </select>
                <select
                  v-if="mostraDepartamentVista"
                  :value="authStore.departamentVista"
                  @change="authStore.actualitzarDepartamentVista($event.target.value)"
                  class="max-w-[11rem] rounded border border-amber-200 bg-white px-2 py-1 text-xs font-bold text-amber-950 focus:outline-none"
                >
                  <option value="">Tria departament</option>
                  <option
                    v-for="dep in departamentsVistaOrdenats"
                    :key="dep.id || dep.nom"
                    :value="dep.nom"
                  >
                    {{ dep.nom }}
                  </option>
                </select>
              </div>

              <span
                v-if="authStore.estaAutenticat"
                class="app-user-label max-w-[13rem] truncate border-l pl-3 text-sm font-medium"
              >
                {{ etiquetaUsuariActiu }}
              </span>

              <a
                :href="tutorialUrl"
                target="_blank"
                rel="noopener"
                class="app-nav-button inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition"
                title="Obrir guia d'ajuda"
                aria-label="Obrir guia d'ajuda"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.25" />
                  <path stroke-linecap="round" d="M9.5 9.25a2.5 2.5 0 0 1 4.9.83c0 1.67-2.5 2.5-2.5 3.42M12 16.75h.01" />
                </svg>
                <span class="hidden xl:inline">Ajuda</span>
              </a>

              <button
                type="button"
                class="theme-toggle"
                :aria-label="themeAriaLabel"
                @click="toggleTheme"
              >
                <svg v-if="isDark" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
                </svg>
                <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M20.5 14.4A7.5 7.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
                </svg>
                <span>{{ themeLabel }}</span>
              </button>

              <button
                v-if="authStore.estaAutenticat"
                type="button"
                @click="tancarSessio"
                class="app-nav-button rounded-md px-3 py-2 text-sm font-semibold transition"
              >
                Sortir
              </button>
            </div>
          </div>

          <button
            type="button"
            class="app-nav-button rounded-md p-2 transition lg:hidden"
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

        <div v-if="mobileMenuOpen" class="app-mobile-menu border-t pb-4 pt-2 lg:hidden">
          <div class="space-y-0.5" role="menu" aria-label="Navegació principal">
            <router-link
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              role="menuitem"
              class="app-nav-link flex items-center rounded-md px-3 py-3 text-sm font-semibold transition"
              :class="isActive(link.to)
                ? 'app-nav-link-active'
                : 'app-nav-link-idle'"
              @click="mobileMenuOpen = false"
            >
              {{ link.label }}
            </router-link>
          </div>

          <div class="app-mobile-user mt-3 border-t px-1 pt-3">
            <a
              :href="tutorialUrl"
              target="_blank"
              rel="noopener"
              class="app-nav-link app-nav-link-idle mb-1 flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-semibold transition"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9.25" />
                <path stroke-linecap="round" d="M9.5 9.25a2.5 2.5 0 0 1 4.9.83c0 1.67-2.5 2.5-2.5 3.42M12 16.75h.01" />
              </svg>
              Ajuda
            </a>
            <button
              type="button"
              class="theme-toggle w-full justify-center"
              :aria-label="themeAriaLabel"
              @click="toggleTheme"
            >
              <svg v-if="isDark" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M20.5 14.4A7.5 7.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
              </svg>
              <span>{{ themeLabel }}</span>
            </button>
          </div>

          <div class="app-mobile-user mt-3 space-y-3 border-t px-1 pt-3">
            <select
              v-if="authStore.estaAutenticat && cursStore.cursos.length"
              :value="cursStore.cursActiuId"
              @change="cursStore.canviarCursActiu($event.target.value)"
              class="app-select w-full rounded-md px-3 py-2 text-sm font-semibold focus:outline-none"
            >
              <option v-for="c in cursStore.cursos" :key="c.id" :value="c.id">
                {{ c.nom || c.id }}{{ c.bloqueig ? ' (bloquejat)' : '' }}
              </option>
            </select>

            <div
              v-if="authStore.esAdminReal()"
              class="rounded-md border border-amber-200 bg-amber-50 p-2"
            >
              <label class="mb-1 block text-xs font-bold uppercase text-amber-800">Vista</label>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  :value="vistaRolSeleccionada"
                  @change="canviarVistaRol($event.target.value)"
                  class="rounded border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-amber-950 focus:outline-none"
                >
                  <option value="admin">Administració</option>
                  <option value="cap_departament">Cap de departament</option>
                  <option value="professor">Professor</option>
                </select>
                <select
                  v-if="mostraDepartamentVista"
                  :value="authStore.departamentVista"
                  @change="authStore.actualitzarDepartamentVista($event.target.value)"
                  class="rounded border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-amber-950 focus:outline-none"
                >
                  <option value="">Tria departament</option>
                  <option
                    v-for="dep in departamentsVistaOrdenats"
                    :key="dep.id || dep.nom"
                    :value="dep.nom"
                  >
                    {{ dep.nom }}
                  </option>
                </select>
              </div>
            </div>

            <div v-if="authStore.estaAutenticat" class="flex items-center justify-between gap-3">
              <span class="app-user-label truncate text-sm font-medium">
                {{ etiquetaUsuariActiu }}
              </span>
              <button
                type="button"
                @click="tancarSessio"
                class="app-nav-button shrink-0 rounded-md border px-4 py-1.5 text-sm font-semibold transition"
              >
                Sortir
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex h-0.5">
        <div class="flex-1 bg-danger"></div>
        <div class="flex-1 bg-success"></div>
        <div class="flex-1 bg-primary"></div>
      </div>
    </nav>

    <main id="main-content" :class="mainClass">
      <div
        v-if="esperantCurs"
        class="card p-8 text-center text-sm font-medium text-slate-700"
      >
        Carregant curs...
      </div>
      <div
        v-else-if="senseCurs"
        class="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center text-sm font-medium text-amber-900 shadow-sm"
      >
        Cap curs actiu. Selecciona'n un a Administració > Curs acadèmic.
      </div>
      <router-view v-else />
    </main>

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCursStore } from './stores/curs';
import { iniciarPresenciaGlobal } from './services/presencia';
import { useCursCollectionSnapshot } from './composables/useColSnapshot';
import { useTheme } from './composables/useTheme';
import ToastContainer from './components/ToastContainer.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cursStore = useCursStore();
const mobileMenuOpen = ref(false);
const { isDark, themeLabel, themeAriaLabel, toggleTheme } = useTheme();
let stopPresenciaGlobal = null;

const { items: departamentsVista } = useCursCollectionSnapshot({
  colName: 'departaments',
  enabled: computed(() => authStore.esAdminReal() && Boolean(cursStore.cursActiuId)),
});

const departamentsVistaOrdenats = computed(() =>
  [...departamentsVista.value].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'ca'))
);

const links = computed(() => {
  const visibles = [{ to: '/', label: 'Inici' }];
  if (authStore.esAdmin()) visibles.push({ to: '/admin', label: 'Administració' });
  if (authStore.esCapDepartament()) visibles.push({ to: '/departament', label: 'Departaments' });
  if (authStore.estaAutenticat) visibles.push({ to: '/resums', label: 'Resums' });
  return visibles;
});

const vistaRolSeleccionada = computed(() => authStore.rolVista || 'admin');
const mostraDepartamentVista = computed(() =>
  ['cap_departament', 'departament'].includes(authStore.rolVista)
);

const etiquetaUsuariActiu = computed(() => {
  const nom = authStore.usuari || authStore.email || authStore.rolActiu || '';
  if (!authStore.esVistaSimulada) return nom;
  const rol = authStore.rolActiu === 'professor' ? 'Professor' : 'Cap de departament';
  const departament = authStore.departamentActiu ? ` · ${authStore.departamentActiu}` : '';
  return `${nom} (${rol}${departament})`;
});

const tutorialUrl = computed(() => {
  if (!authStore.estaAutenticat) return '/docs/index.html';
  if (authStore.rolActiu === 'admin') return '/docs/tutorial-admin.html';
  return '/docs/tutorial-caps.html';
});

const mainClass = computed(() =>
  route.path === '/'
    ? 'min-h-[calc(100vh-4.125rem)]'
    : 'mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8'
);

function isActive(to) {
  return route.path === to || (to !== '/' && route.path.startsWith(`${to}/`));
}

function canviarVistaRol(nouRol) {
  if (nouRol === 'cap_departament' || nouRol === 'departament') {
    const departaments = departamentsVistaOrdenats.value;
    const departamentVistaValida = departaments.some((dep) => dep.nom === authStore.departamentVista);
    const departament = departamentVistaValida
      ? authStore.departamentVista
      : departaments[0]?.nom || '';
    authStore.activarVistaRol(nouRol, departament);
    if (!route.path.startsWith('/departament')) {
      router.push('/departament');
    }
    return;
  }
  authStore.activarVistaRol(nouRol);
  if (
    nouRol === 'professor' &&
    (route.path === '/' || route.path.startsWith('/admin') || route.path.startsWith('/departament'))
  ) {
    router.push('/resums');
  }
}

watch(() => route.path, () => { mobileMenuOpen.value = false; });

watch(
  () => [
    authStore.estaAutenticat,
    authStore.uid,
    authStore.usuari,
    authStore.email,
    authStore.photoURL,
    authStore.rolActiu,
    authStore.departamentActiu,
    cursStore.cursActiuId,
    route.fullPath,
  ],
  () => {
    stopPresenciaGlobal?.();
    stopPresenciaGlobal = null;

    if (!authStore.estaAutenticat || !authStore.uid || !cursStore.cursActiuId) return;

    stopPresenciaGlobal = iniciarPresenciaGlobal({
      cursId: cursStore.cursActiuId,
      user: {
        uid: authStore.uid,
        usuari: authStore.usuari,
        email: authStore.email,
        photoURL: authStore.photoURL,
        rol: authStore.rolActiu,
        departament: authStore.departamentActiu,
      },
      getPath: () => route.fullPath,
    });
  },
  { immediate: true }
);

watch(
  () => [authStore.rolActiu, authStore.departamentActiu, route.path],
  () => {
    if (!authStore.estaAutenticat) return;
    if (route.path.startsWith('/admin') && !authStore.esAdmin()) {
      router.push(authStore.esCapDepartament() ? '/departament' : '/resums');
    } else if (route.path.startsWith('/departament') && !authStore.esCapDepartament()) {
      router.push('/resums');
    }
  }
);

watch(
  [mostraDepartamentVista, departamentsVistaOrdenats],
  ([mostra, departaments]) => {
    if (!mostra || !departaments.length) return;
    const existeix = departaments.some((dep) => dep.nom === authStore.departamentVista);
    if (!existeix) {
      authStore.actualitzarDepartamentVista(departaments[0].nom);
    }
  },
  { immediate: true }
);

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

onUnmounted(() => {
  stopPresenciaGlobal?.();
});
</script>
