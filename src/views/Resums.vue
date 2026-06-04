<template>
  <div class="form-container resums-page">
    <div class="resums-tabs">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="resums-tab"
          :class="activeTab === tab.id
            ? 'resums-tab-active'
            : 'resums-tab-idle'"
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

const activeTab = ref('grups');

const tabs = [
  { id: 'grups', name: 'Grups' },
  { id: 'caps-departament', name: 'Caps de departament' },
  { id: 'coordinacions', name: 'Coordinacions' },
  { id: 'tutories', name: 'Tutories' },
];

const components = {
  grups: defineAsyncComponent(() => import('../components/ResumGrups.vue')),
  'caps-departament': defineAsyncComponent(() => import('../components/ResumCapsDepartament.vue')),
  coordinacions: defineAsyncComponent(() => import('../components/ResumCoordinacions.vue')),
  tutories: defineAsyncComponent(() => import('../components/ResumTutories.vue')),
};

const componentActual = computed(() => components[activeTab.value] || components.grups);
</script>
