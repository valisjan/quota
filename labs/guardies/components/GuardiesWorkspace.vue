<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import GuardiesCoveragePanel from './GuardiesCoveragePanel.vue';
import GuardiesIncidentPanel from './GuardiesIncidentPanel.vue';
import { useGuardiesStore } from '../stores/guardies.js';

const { canWrite, isAdmin, teacherView, authRequired, adminSection, teacherSection, contextReady, persistenceStatus, dayPersistenceStatus, dayLoaded, sessions, dayStatus } = storeToRefs(useGuardiesStore());
const visible = computed(() => !contextReady.value
  || (canWrite.value && adminSection.value === 'daily')
  || (!canWrite.value && !authRequired.value && teacherSection.value === 'daily'));
const isLoading = computed(() => !contextReady.value || persistenceStatus.value === 'loading' || dayPersistenceStatus.value === 'loading');
const hasData = computed(() => (
  contextReady.value
  && persistenceStatus.value !== 'loading'
  && dayPersistenceStatus.value !== 'loading'
  && dayLoaded.value
  && sessions.value.length > 0
  && ((isAdmin.value && !teacherView.value) || ['published', 'closed'].includes(dayStatus.value))
));
const emptyTitle = computed(() => {
  if (isLoading.value) return 'Carregant dades…';
  if (persistenceStatus.value === 'stale') return 'Dades locals carregades · connexió pendent';
  if (persistenceStatus.value === 'error') return 'No s\'ha pogut connectar amb Quota';
  if (sessions.value.length && !canWrite.value && !['published', 'closed'].includes(dayStatus.value)) return 'Jornada encara no publicada';
  return canWrite.value ? "Carrega l'horari per començar" : 'Encara no hi ha cap full de guàrdies disponible';
});
</script>

<template>
  <section v-show="visible && !hasData" id="empty-state" class="empty" :class="{ 'is-loading': isLoading }" role="status" aria-live="polite">
    <span v-if="isLoading" class="loading-spinner" aria-hidden="true"></span>
    <h2>{{ emptyTitle }}</h2>
  </section>

  <section v-show="visible && hasData" id="workspace" class="workspace">
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
