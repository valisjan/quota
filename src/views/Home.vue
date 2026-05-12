<template>
  <!-- Escape main's horizontal padding so image goes edge-to-edge -->
  <div class="-mx-3 sm:-mx-6 lg:-mx-8">
    <div class="relative flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center overflow-hidden">

      <!-- Background image -->
      <img
        :src="heroImageUrl"
        alt="IES Josep Sureda i Blanes"
        class="absolute inset-0 h-full w-full object-cover object-center"
      />
      <!-- Overlays -->
      <div class="absolute inset-0 bg-slate-950/55"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
      <!-- Top color bar -->
      <div class="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-[#0024B6] via-[#00BF33] to-[#FF8040]"></div>

      <!-- Floating content -->
      <div class="relative w-full max-w-7xl px-6 py-16 sm:px-10">
        <div class="flex flex-col items-center gap-10 lg:flex-row lg:items-end lg:justify-between">

          <!-- Branding + steps -->
          <div class="max-w-2xl text-center text-white lg:text-left">
            <p class="text-sm font-medium tracking-widest text-white/60">IES Josep Sureda i Blanes</p>
            <h1 class="mt-3 text-6xl font-semibold tracking-tight sm:text-7xl lg:text-8xl">QUOTA</h1>
            <p class="mt-4 text-base leading-7 text-white/80 sm:text-lg">
              Importa el full de Sheets, reparteix les hores per departament i exporta-ho a l'Untis.
            </p>
            <div class="mt-8 hidden max-w-lg gap-3 sm:grid sm:grid-cols-3">
              <div class="home-step home-step-photo">
                <span>01</span>
                <strong>Importa</strong>
                <p>Sheets</p>
              </div>
              <div class="home-step home-step-photo">
                <span>02</span>
                <strong>Reparteix</strong>
                <p>Per departament</p>
              </div>
              <div class="home-step home-step-photo">
                <span>03</span>
                <strong>Exporta</strong>
                <p>Untis</p>
              </div>
            </div>
          </div>

          <!-- Floating login card -->
          <div class="w-full max-w-sm shrink-0">
            <div class="overflow-hidden rounded-xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-md">
              <div class="h-1 bg-[#0024B6]"></div>
              <div class="p-5 sm:p-6">

                <div class="mb-5">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/50">Accés</p>
                  <h2 class="mt-1 text-xl font-semibold text-white">{{ titolAcces }}</h2>
                  <p v-if="textAcces" class="mt-2 text-sm text-white/70">{{ textAcces }}</p>
                </div>

                <template v-if="authStore.estaAutenticat">
                  <div class="rounded-lg border border-white/15 bg-white/10 p-4">
                    <p class="truncate text-sm font-semibold text-white">{{ authStore.usuari }}</p>
                    <p class="mt-1 text-xs font-medium text-white/60">{{ etiquetaRol }}</p>
                  </div>

                  <div class="mt-4 space-y-2">
                    <button
                      v-if="authStore.esAdmin()"
                      @click="router.push('/admin/sincronitzacio')"
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
                    class="mt-5 text-sm font-medium text-white/50 transition hover:text-white hover:underline"
                  >
                    Tancar sessió
                  </button>
                </template>

                <template v-else-if="authStore.esPendent">
                  <div class="rounded-lg border border-amber-300/30 bg-amber-400/20 p-4">
                    <p class="font-semibold text-amber-200">Accés pendent d'aprovació</p>
                    <p class="mt-2 text-sm leading-6 text-amber-100/80">
                      Has iniciat sessió com <strong>{{ authStore.email }}</strong>, però encara no tens cap rol assignat.
                    </p>
                  </div>
                  <button
                    @click="authStore.tancarSessio()"
                    class="mt-5 text-sm font-medium text-white/50 transition hover:text-white hover:underline"
                  >
                    Tancar sessió
                  </button>
                </template>

                <template v-else>
                  <button
                    @click="iniciarSessio"
                    :disabled="carregant"
                    class="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-5 py-4 font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <svg class="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {{ carregant ? 'Iniciant sessió...' : 'Entrar amb Google' }}
                  </button>
                  <p v-if="errorLogin" class="mt-4 text-sm font-semibold text-red-300">{{ errorLogin }}</p>
                  <p class="mt-4 text-center text-xs font-medium text-white/40">
                    Només comptes @iesjosepsuredaiblanes.com
                  </p>
                </template>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const carregant = ref(false);
const errorLogin = ref('');
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
  if (authStore.estaAutenticat) return "Hola, " + (authStore.usuari || "").split(" ")[0];
  if (authStore.esPendent) return "Pendent de validació";
  return "Accés";
});

const textAcces = computed(() => {
  if (authStore.estaAutenticat) return "";
  if (authStore.esPendent) return "Encara no tens rol assignat. Avissa l'administrador si ho necessites.";
  return "";
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
