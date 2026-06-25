<template>
  <div class="resums-page">
    <div class="print-only print-doc-header">
      <div class="print-school">IES Josep Sureda i Blanes · Seguiment de la distribució</div>
      <div class="print-title">{{ tabActual?.name }}</div>
      <div class="print-meta">
        <span>Data: {{ dataAvui }}</span>
      </div>
    </div>

    <div class="resums-tabs print-hide">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="activeTab = tab.id"
            class="resums-tab"
            :class="activeTab === tab.id ? 'resums-tab-active' : 'resums-tab-idle'"
          >
            {{ tab.name }}
          </button>
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
import { computed, defineAsyncComponent, ref } from 'vue';

const activeTab = ref('estat');

const tabs = [
  { id: 'estat', name: 'Estat global' },
  { id: 'validacio', name: 'Validació final' },
  { id: 'departaments', name: 'Departaments' },
  { id: 'professors', name: 'Professors' },
  { id: 'guardies', name: 'Guàrdies' },
  { id: 'poca-carrega', name: 'Poca càrrega' },
  { id: 'majors-55', name: '>55' },
];

const components = {
  estat: defineAsyncComponent(() => import('./EstatDepartaments.vue')),
  validacio: defineAsyncComponent(() => import('./ResumValidacioFinal.vue')),
  departaments: defineAsyncComponent(() => import('./ResumDepartaments.vue')),
  professors: defineAsyncComponent(() => import('./ResumProfessors.vue')),
  guardies: defineAsyncComponent(() => import('./ResumGuardies.vue')),
  'poca-carrega': defineAsyncComponent(() => import('./ResumPocesHores.vue')),
  'majors-55': defineAsyncComponent(() => import('./ResumMajors55.vue')),
};

const componentActual = computed(() => components[activeTab.value] || components.estat);
const tabActual = computed(() => tabs.find((tab) => tab.id === activeTab.value));

const dataAvui = new Date().toLocaleDateString('ca-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function imprimir() {
  window.print();
}
</script>
