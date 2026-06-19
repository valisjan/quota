<template>
  <div class="resums-page">
    <div class="resums-tabs">
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
</script>
