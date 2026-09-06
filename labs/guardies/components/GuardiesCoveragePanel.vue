<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { absencies, assignacions, canWrite, dayStatus, updatedAt } = storeToRefs(store);
const autoAssignmentFeedback = ref('');
const autoAssignmentFeedbackKind = ref('');
const statusLabel = computed(() => ({ draft: 'ESBORRANY', published: 'PUBLICADA', closed: 'TANCADA' }[dayStatus.value] || 'ESBORRANY'));
const printedAt = computed(() => new Intl.DateTimeFormat('ca-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()));
const canAutoAssign = computed(() => canWrite.value && dayStatus.value !== 'closed' && Array.from(absencies.value.values()).some((item) => (
  !item.sessions?.some((session) => session.activitat === 'GP') && !assignacions.value.has(item.id)
)));

function autoAssign() {
  autoAssignmentFeedback.value = 'Assignant...';
  autoAssignmentFeedbackKind.value = '';
  window.dispatchEvent(new CustomEvent('guardies:auto-assign'));
}

function handleAutoAssignmentResult(event) {
  autoAssignmentFeedback.value = event.detail?.message || '';
  autoAssignmentFeedbackKind.value = event.detail?.ok ? 'success' : 'error';
}

onMounted(() => window.addEventListener('guardies:auto-assign-result', handleAutoAssignmentResult));
onBeforeUnmount(() => window.removeEventListener('guardies:auto-assign-result', handleAutoAssignmentResult));
</script>

<template>
  <section class="day-panel">
    <div class="print-header">
      <h1>Guàrdies del dia</h1>
      <p id="print-date-label"></p>
      <div class="print-meta"><strong>{{ statusLabel }}</strong> · Impressió {{ printedAt }}<span v-if="updatedAt"> · Versió actualitzada</span></div>
    </div>
    <div class="day-panel-head no-print">
      <div>
        <p class="kicker">Full de guàrdies</p>
        <h2>Absències per hora</h2>
      </div>
      <div v-if="canWrite" class="day-panel-actions">
        <button id="auto-assign-guards" type="button" :disabled="!canAutoAssign" @click="autoAssign">Assigna automàticament</button>
        <span v-if="autoAssignmentFeedback" class="auto-assignment-feedback" :class="`is-${autoAssignmentFeedbackKind}`" role="status" aria-live="polite">{{ autoAssignmentFeedback }}</span>
      </div>
    </div>
    <div id="coverage-list" class="coverage-list"></div>
  </section>
</template>
