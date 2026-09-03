<script setup>
import { storeToRefs } from 'pinia';
import GuardiesCoveragePanel from './GuardiesCoveragePanel.vue';
import GuardiesIncidentPanel from './GuardiesIncidentPanel.vue';
import { useGuardiesStore } from '../stores/guardies.js';

const { canWrite } = storeToRefs(useGuardiesStore());
</script>

<template>
  <section id="empty-state" class="empty">
    <h2>Carrega l'horari per començar</h2>
    <p>Obre Arxius de configuració i completa els quatre passos de preparació.</p>
  </section>

  <section id="workspace" class="workspace hidden">
    <section class="stats hidden" aria-label="Resum del XML">
      <strong id="stat-sessions">0</strong>
      <strong id="stat-professors">0</strong>
      <strong id="stat-grups">0</strong>
      <strong id="stat-activitats">0</strong>
      <strong id="stat-reference">No</strong>
    </section>

    <div class="guard-layout" :class="{ 'is-readonly': !canWrite }">
      <GuardiesIncidentPanel v-show="canWrite" />
      <GuardiesCoveragePanel />
    </div>
  </section>
</template>
