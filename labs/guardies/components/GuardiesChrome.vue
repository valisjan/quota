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

const { canWrite, contextReady } = storeToRefs(useGuardiesStore());
</script>

<template>
  <GuardiesTopBar />
  <Teleport to="#guardies-work-header-root">
    <GuardiesWorkHeader />
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
    <GuardiesTeacherStats />
  </Teleport>
  <Teleport to="#guardies-workspace-root">
    <GuardiesWorkspace />
  </Teleport>
</template>
