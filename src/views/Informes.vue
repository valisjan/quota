<template>
  <div class="form-container resums-page">
    <!-- Capçalera impressió -->
    <div class="print-only print-doc-header">
      <div class="print-school">IES Josep Sureda i Blanes · Distribució de la càrrega lectiva</div>
      <div class="print-title">{{ tabActual?.name }}</div>
      <div class="print-meta">
        <span>Data: {{ dataAvui }}</span>
      </div>
    </div>

    <div class="resums-tabs print-hide">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <template v-for="grup in grups" :key="grup.titol">
            <span v-if="grups.length > 1" class="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{{ grup.titol }}</span>
            <button
              v-for="tab in grup.tabs"
              :key="tab.id"
              type="button"
              @click="activeTab = tab.id"
              class="resums-tab"
              :class="activeTab === tab.id ? 'resums-tab-active' : 'resums-tab-idle'"
            >
              {{ tab.name }}
            </button>
          </template>
        </div>
        <button
          type="button"
          @click="imprimir"
          class="app-button-secondary min-h-9 px-3 py-1.5"
          title="Imprimir o exportar a PDF"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
          </svg>
          Imprimir
        </button>
      </div>
    </div>

    <component :is="componentActual" />
  </div>
</template>

<script setup>
// Informes: els resums que pot consultar tot el professorat (per transparència) i, per a
// l'administració, el seguiment i la validació del repartiment.
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const PUBLICS = [
  { id: 'grups', name: 'Grups', component: () => import('../components/ResumGrups.vue') },
  { id: 'caps-departament', name: 'Caps de departament', component: () => import('../components/ResumCapsDepartament.vue') },
  { id: 'coordinacions', name: 'Coordinacions', component: () => import('../components/ResumCoordinacions.vue') },
  { id: 'tutories', name: 'Tutories', component: () => import('../components/ResumTutories.vue') },
];

const ADMINISTRACIO = [
  { id: 'estat', name: 'Estat global', component: () => import('../components/EstatDepartaments.vue') },
  { id: 'validacio', name: 'Validació final', component: () => import('../components/ResumValidacioFinal.vue') },
  { id: 'departaments', name: 'Departaments', component: () => import('../components/ResumDepartaments.vue') },
  { id: 'professors', name: 'Professors', component: () => import('../components/ResumProfessors.vue') },
  { id: 'guardies', name: 'Guàrdies', component: () => import('../components/ResumGuardies.vue') },
  { id: 'poca-carrega', name: 'Poca càrrega', component: () => import('../components/ResumPocesHores.vue') },
  { id: 'majors-55', name: '>55', component: () => import('../components/ResumMajors55.vue') },
];

const components = Object.fromEntries([...PUBLICS, ...ADMINISTRACIO]
  .map((tab) => [tab.id, defineAsyncComponent(tab.component)]));

const grups = computed(() => (authStore.esAdmin()
  ? [{ titol: 'Seguiment', tabs: ADMINISTRACIO }, { titol: 'Resums', tabs: PUBLICS }]
  : [{ titol: 'Resums', tabs: PUBLICS }]));
const tabsVisibles = computed(() => grups.value.flatMap((grup) => grup.tabs));

const activeTab = ref(authStore.esAdmin() ? 'estat' : 'grups');
// Si canvia la vista (p. ex. l'administració es posa la de professor), la pestanya ha de ser visible.
watch(tabsVisibles, (tabs) => {
  if (!tabs.some((tab) => tab.id === activeTab.value)) activeTab.value = tabs[0].id;
});

const componentActual = computed(() => components[activeTab.value] || components.grups);
const tabActual = computed(() => tabsVisibles.value.find((tab) => tab.id === activeTab.value));

const dataAvui = new Date().toLocaleDateString('ca-ES', {
  day: 'numeric', month: 'long', year: 'numeric',
});

async function imprimir() {
  await nextTick();
  setTimeout(() => window.print(), 150);
}
</script>
