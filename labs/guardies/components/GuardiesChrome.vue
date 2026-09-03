<script setup>
import GuardiesTopBar from './GuardiesTopBar.vue';
import GuardiesWorkHeader from './GuardiesWorkHeader.vue';
import GuardiesSetupPanel from './GuardiesSetupPanel.vue';
import GuardiesConvivenciaPanel from './GuardiesConvivenciaPanel.vue';
import GuardiesWorkspace from './GuardiesWorkspace.vue';
</script>

<template>
  <GuardiesTopBar />
  <Teleport to="#guardies-work-header-root">
    <GuardiesWorkHeader />
  </Teleport>
  <Teleport to="#guardies-setup-root">
    <GuardiesSetupPanel />
  </Teleport>
  <Teleport to="#guardies-convivencia-root">
    <GuardiesConvivenciaPanel />
  </Teleport>
  <Teleport to="#guardies-workspace-root">
    <GuardiesWorkspace />
  </Teleport>
</template>
