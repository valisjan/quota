<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { dayStatus, updatedAt } = storeToRefs(store);
const statusLabel = computed(() => ({ draft: 'ESBORRANY', published: 'PUBLICADA', closed: 'TANCADA' }[dayStatus.value] || 'ESBORRANY'));
const printedAt = computed(() => new Intl.DateTimeFormat('ca-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()));
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
      <span class="day-panel-hint">Preassignació i observacions</span>
    </div>
    <div id="coverage-list" class="coverage-list"></div>
  </section>
</template>
