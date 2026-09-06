<script setup>
import { storeToRefs } from 'pinia';
import GuardiesTopBar from './GuardiesTopBar.vue';
import GuardiesWorkHeader from './GuardiesWorkHeader.vue';
import GuardiesSetupPanel from './GuardiesSetupPanel.vue';
import GuardiesPatiPanel from './GuardiesPatiPanel.vue';
import GuardiesConvivenciaPanel from './GuardiesConvivenciaPanel.vue';
import GuardiesWorkspace from './GuardiesWorkspace.vue';
import GuardiesTeacherStats from './GuardiesTeacherStats.vue';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { canWrite, contextReady, teacherSection } = storeToRefs(store);
</script>

<template>
  <GuardiesTopBar />
  <Teleport to="#guardies-work-header-root">
    <GuardiesWorkHeader v-show="canWrite || teacherSection === 'daily'" />
  </Teleport>
  <Teleport to="#guardies-setup-root">
    <GuardiesSetupPanel v-show="canWrite" />
  </Teleport>
  <Teleport to="#guardies-convivencia-root">
    <GuardiesConvivenciaPanel v-show="canWrite" />
  </Teleport>
  <Teleport to="#guardies-pati-root">
    <GuardiesPatiPanel v-show="canWrite" />
  </Teleport>
  <Teleport v-if="contextReady && !canWrite" to="#guardies-setup-root">
    <nav class="teacher-view-tabs no-print" aria-label="Vista del professorat" role="tablist">
      <button type="button" role="tab" :aria-selected="teacherSection === 'daily'" :class="{ active: teacherSection === 'daily' }" @click="store.teacherSection = 'daily'">Guàrdies del dia</button>
      <button type="button" role="tab" :aria-selected="teacherSection === 'stats'" :class="{ active: teacherSection === 'stats' }" @click="store.teacherSection = 'stats'">Guàrdies realitzades</button>
    </nav>
    <GuardiesTeacherStats v-show="teacherSection === 'stats'" />
  </Teleport>
  <Teleport to="#guardies-workspace-root">
    <GuardiesWorkspace />
  </Teleport>
</template>
