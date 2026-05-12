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
            ? 'bg-[#0024B6] text-white'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950'"
        >
          {{ tab.name }}
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'estat'">
      <EstatDepartaments />
    </div>
    <div v-else-if="activeTab === 'grups'">
      <ResumGrups />
    </div>
    <div v-else-if="activeTab === 'departaments'">
      <ResumDepartaments />
    </div>
    <div v-else-if="activeTab === 'professors'">
      <ResumProfessors />
    </div>
    <div v-else-if="activeTab === 'poces-hores'">
      <ResumPocesHores />
    </div>
    <div v-else-if="activeTab === 'coordinacions'">
      <ResumCoordinacions />
    </div>
    <div v-else-if="activeTab === 'tutories'">
      <ResumTutories />
    </div>
    <div v-else-if="activeTab === 'caps-departament'">
      <ResumCapsDepartament />
    </div>
    <div v-else-if="activeTab === 'majors-55'">
      <ResumMajors55 />
    </div>
    <div v-else-if="activeTab === 'validacio'">
      <ResumValidacioFinal />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import EstatDepartaments from '../components/EstatDepartaments.vue';
import ResumGrups from '../components/ResumGrups.vue';
import ResumDepartaments from '../components/ResumDepartaments.vue';
import ResumProfessors from '../components/ResumProfessors.vue';
import ResumPocesHores from '../components/ResumPocesHores.vue';
import ResumCoordinacions from '../components/ResumCoordinacions.vue';
import ResumTutories from '../components/ResumTutories.vue';
import ResumCapsDepartament from '../components/ResumCapsDepartament.vue';
import ResumMajors55 from '../components/ResumMajors55.vue';
import ResumValidacioFinal from '../components/ResumValidacioFinal.vue';

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
</script>
