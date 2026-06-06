<template>
  <section class="relative min-h-[calc(100vh-4.125rem)] overflow-hidden bg-slate-950">
    <img
      :src="heroImageUrl"
      alt="IES Josep Sureda i Blanes"
      class="absolute inset-0 h-full w-full object-cover object-center"
    />
    <div class="absolute inset-0 bg-slate-950/55"></div>
    <div class="absolute inset-y-0 left-0 w-full bg-slate-950/45 lg:w-3/5"></div>

    <div class="relative mx-auto grid min-h-[calc(100vh-4.125rem)] w-full max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-10">
      <div class="max-w-3xl text-white">
        <p class="text-sm font-semibold uppercase text-white/70">IES Josep Sureda i Blanes</p>
        <h1 class="mt-4 text-5xl font-semibold leading-none sm:text-6xl lg:text-7xl">QUOTA</h1>
        <p class="mt-5 max-w-2xl text-lg leading-8 text-white/85">
          Eina pròpia de l'IES Josep Sureda i Blanes per gestionar la quota i la distribució d'hores per departaments.
        </p>
      </div>

      <div class="w-full max-w-sm justify-self-center lg:justify-self-end">
        <div class="rounded-lg border border-white/15 bg-white p-5 text-slate-950 shadow-xl sm:p-6">
          <div class="mb-5 border-b border-slate-200 pb-5">
            <p class="text-xs font-semibold uppercase text-slate-600">Accés</p>
            <h2 class="mt-1 text-3xl font-semibold">{{ titolAcces }}</h2>
            <p v-if="textAcces" class="mt-2 text-sm leading-6 text-slate-700">{{ textAcces }}</p>
          </div>

          <template v-if="authStore.estaAutenticat">
            <div class="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p class="truncate text-sm font-semibold text-slate-950">{{ authStore.usuari }}</p>
              <p class="mt-1 text-xs font-medium text-slate-600">{{ etiquetaRol }}</p>
            </div>

            <UsuarisConnectats
              v-if="authStore.esAdmin()"
              class="mt-4"
              :limit="5"
            />

            <div class="mt-4 space-y-2">
              <button
                v-if="authStore.esAdmin()"
                @click="router.push('/admin/dades')"
                class="portal-action portal-action-primary"
              >
                Administració
                <span>Centre de control</span>
              </button>
              <button
                v-if="authStore.esCapDepartament()"
                @click="router.push('/departament')"
                class="portal-action"
              >
                Departament
                <span>Repartiment d'hores</span>
              </button>
              <button
                @click="router.push('/resums')"
                class="portal-action"
              >
                Seguiment
                <span>Estat i resums</span>
              </button>
            </div>

            <button
              @click="authStore.tancarSessio()"
              class="mt-5 text-sm font-semibold text-slate-600 transition hover:text-slate-950 hover:underline"
            >
              Tancar sessió
            </button>
          </template>

          <template v-else-if="authStore.esPendent">
            <div class="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p class="font-semibold text-amber-900">Accés pendent d'aprovació</p>
              <p class="mt-2 text-sm leading-6 text-amber-900/80">
                Has iniciat sessió com <strong>{{ authStore.email }}</strong>, però encara no tens cap rol assignat.
              </p>
            </div>
            <button
              @click="authStore.tancarSessio()"
              class="mt-5 text-sm font-semibold text-slate-600 transition hover:text-slate-950 hover:underline"
            >
              Tancar sessió
            </button>
          </template>

          <template v-else>
            <button
              @click="iniciarSessio"
              :disabled="carregant"
              class="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-950 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {{ carregant ? 'Iniciant sessió...' : 'Entrar amb Google' }}
            </button>
            <p v-if="errorLogin" class="mt-4 text-sm font-semibold text-red-800">{{ errorLogin }}</p>
            <p class="mt-4 text-center text-xs font-medium text-slate-600">
              Només comptes @iesjosepsuredaiblanes.com
            </p>
          </template>
        </div>
      </div>

      <p class="absolute bottom-4 right-5 select-none rounded bg-slate-950/50 px-2 py-1 text-xs text-white/70">
        v{{ appVersion }} · {{ buildDate }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import UsuarisConnectats from '../components/UsuarisConnectats.vue';

const router = useRouter();
const authStore = useAuthStore();
const carregant = ref(false);

const buildDate = (() => {
  const d = new Date(__BUILD_DATE__);
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
})();
const errorLogin = ref('');
const appVersion = __APP_VERSION__;
const heroImageUrl = 'https://content.gnoss.ws/carq/imagenes/Documentos/imgsem/37/3733/3733d88a-d57c-4dff-a4ba-a5951198b3f1/43c12d9f-45d9-468b-b164-6ee33c982047.jpg';

const etiquetaRol = computed(() => {
  const etiquetes = {
    admin: 'Admin',
    cap_departament: 'Cap de departament',
    departament: 'Cap de departament',
    professor: 'Professor',
  };
  return etiquetes[authStore.rol] || authStore.rol || '';
});

const titolAcces = computed(() => {
  if (authStore.estaAutenticat) return `Hola, ${(authStore.usuari || '').split(' ')[0]}`;
  if (authStore.esPendent) return 'Pendent de validació';
  return 'Accés';
});

const textAcces = computed(() => {
  if (authStore.estaAutenticat) return '';
  if (authStore.esPendent) return "Encara no tens rol assignat. Avissa l'administrador si ho necessites.";
  return '';
});

async function iniciarSessio() {
  carregant.value = true;
  errorLogin.value = '';
  try {
    await authStore.iniciarSessioGoogle();
  } catch (err) {
    carregant.value = false;
    if (err.code === 'auth/unauthorized-domain') {
      errorLogin.value = 'Domini no autoritzat. Afegeix-lo a Firebase Console -> Authentication -> Authorized domains.';
    } else {
      errorLogin.value = 'Error iniciant la sessió: ' + (err.message || err.code);
    }
  }
}
</script>
