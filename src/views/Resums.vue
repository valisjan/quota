<template>
 <div class="form-container">
 <div class="mb-6">
 <div class="flex flex-wrap gap-1.5">
 <button
 v-for="tab in tabs"
 :key="tab.id"
 @click="activeTab = tab.id"
 class="rounded-md px-3 py-1.5 text-sm font-medium transition"
 :class="activeTab === tab.id
 ? 'bg-primary text-white'
 : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950'"
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
 { id: 'grups', name: 'Grups' },
 { id: 'departaments', name: 'Departaments' },
 { id: 'professors', name: 'Professors' },
 { id: 'poces-hores', name: 'Poca càrrega' },
 { id: 'coordinacions', name: 'Coordinacions' },
 { id: 'tutories', name: 'Tutories' },
 { id: 'caps-departament', name: 'Caps de departament' },
 { id: 'majors-55', name: '>55' },
];

const components = {
 estat: defineAsyncComponent(() => import('../components/EstatDepartaments.vue')),
 validacio: defineAsyncComponent(() => import('../components/ResumValidacioFinal.vue')),
 grups: defineAsyncComponent(() => import('../components/ResumGrups.vue')),
 departaments: defineAsyncComponent(() => import('../components/ResumDepartaments.vue')),
 professors: defineAsyncComponent(() => import('../components/ResumProfessors.vue')),
 'poces-hores': defineAsyncComponent(() => import('../components/ResumPocesHores.vue')),
 coordinacions: defineAsyncComponent(() => import('../components/ResumCoordinacions.vue')),
 tutories: defineAsyncComponent(() => import('../components/ResumTutories.vue')),
 'caps-departament': defineAsyncComponent(() => import('../components/ResumCapsDepartament.vue')),
 'majors-55': defineAsyncComponent(() => import('../components/ResumMajors55.vue')),
};

const componentActual = computed(() => components[activeTab.value] || components.estat);
</script>
