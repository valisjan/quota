<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { normalizeGuardCount } from '../../../src/modules/guardies/domain/workflow.js';
import { setGuardiesTeacherCount } from '../../../src/services/guardiesStorage.js';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { courseId, guardCounts, professorOptions } = storeToRefs(store);
const query = ref('');
const saving = ref(new Set());
const saved = ref('');
const error = ref('');

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const rows = computed(() => {
  const term = normalize(query.value).trim();
  return professorOptions.value
    .map((teacher) => ({
      teacherId: teacher.placa,
      label: teacher.label,
      count: normalizeGuardCount(guardCounts.value.get(teacher.placa)),
    }))
    .filter((row) => !term || normalize(`${row.label} ${row.teacherId}`).includes(term))
    .sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true }));
});

async function updateCount(teacherId, source, rawValue) {
  const count = Math.max(0, Math.trunc(Number(rawValue) || 0));
  saving.value = new Set(saving.value).add(teacherId);
  saved.value = '';
  error.value = '';
  try {
    const next = await setGuardiesTeacherCount(courseId.value, teacherId, source, count);
    guardCounts.value = new Map(Object.entries(next.counts || {}));
    saved.value = `${teacherId}:${source}`;
  } catch (cause) {
    error.value = cause?.message || String(cause);
  } finally {
    const nextSaving = new Set(saving.value);
    nextSaving.delete(teacherId);
    saving.value = nextSaving;
  }
}
</script>

<template>
  <details id="guard-counts-panel" class="admin-panel guard-counts-panel no-print">
    <summary>
      <span class="admin-summary-title">
        <span class="admin-icon" aria-hidden="true">#</span>
        <strong>Recompte de guàrdies</strong>
      </span>
      <span class="cache-info">{{ professorOptions.length }} professors</span>
    </summary>
    <div class="admin-body admin-body-single">
      <section class="admin-block">
        <div class="guard-count-toolbar">
          <label for="guard-count-search">Professorat</label>
          <input id="guard-count-search" v-model="query" type="search" placeholder="Nom o codi…" />
        </div>
        <div class="guard-count-table" role="table" aria-label="Recompte manual de guàrdies">
          <div class="guard-count-row guard-count-columns" role="row">
            <span role="columnheader">Professorat</span>
            <span role="columnheader">Alliberat</span>
            <span role="columnheader">G</span>
            <span role="columnheader">Total</span>
          </div>
          <div v-for="row in rows" :key="row.teacherId" class="guard-count-row" role="row">
            <strong role="cell">{{ row.label }}</strong>
            <label role="cell" :for="`released-count-${row.teacherId}`">
              <input
                :id="`released-count-${row.teacherId}`"
                type="number"
                min="0"
                step="1"
                :value="row.count.released"
                :disabled="saving.has(row.teacherId)"
                :aria-label="`Guàrdies com a alliberat de ${row.label}`"
                @change="updateCount(row.teacherId, 'released', $event.target.value)"
              />
              <small v-if="saved === `${row.teacherId}:released`">Desat</small>
            </label>
            <label role="cell" :for="`guard-count-${row.teacherId}`">
              <input
                :id="`guard-count-${row.teacherId}`"
                type="number"
                min="0"
                step="1"
                :value="row.count.guard"
                :disabled="saving.has(row.teacherId)"
                :aria-label="`Guàrdies G de ${row.label}`"
                @change="updateCount(row.teacherId, 'guard', $event.target.value)"
              />
              <small v-if="saved === `${row.teacherId}:guard`">Desat</small>
            </label>
            <b role="cell">{{ row.count.total }}</b>
          </div>
        </div>
        <p v-if="error" class="guard-count-error" role="alert">{{ error }}</p>
      </section>
    </div>
  </details>
</template>
