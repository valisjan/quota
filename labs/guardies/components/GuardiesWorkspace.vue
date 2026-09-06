<script setup>
import { storeToRefs } from 'pinia';
import GuardiesCoveragePanel from './GuardiesCoveragePanel.vue';
import GuardiesIncidentPanel from './GuardiesIncidentPanel.vue';
import { useGuardiesStore } from '../stores/guardies.js';

const { canWrite, teacherSection } = storeToRefs(useGuardiesStore());
</script>

<template>
  <section v-show="canWrite || teacherSection === 'daily'" id="empty-state" class="empty">
    <h2>{{ canWrite ? "Carrega l'horari per començar" : 'Encara no hi ha cap full de guàrdies disponible' }}</h2>
    <p>{{ canWrite ? 'Obre Arxius de configuració i completa els tres passos de preparació.' : 'Quan la cap d’estudis publiqui la jornada, la podràs consultar aquí.' }}</p>
  </section>

  <section v-show="canWrite || teacherSection === 'daily'" id="workspace" class="workspace hidden">
    <section class="stats hidden" aria-label="Resum de la configuració">
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
