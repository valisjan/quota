<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { normalizeGuardCount } from '../../../src/modules/guardies/domain/workflow.js';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { guardCounts, professorOptions, courseName, viewerName } = storeToRefs(store);
const query = ref('');

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameSignature(value) {
  return normalize(value).split(' ').filter((token) => token.length > 1).sort().join('|');
}

const allRows = computed(() => {
  const labels = new Map(professorOptions.value.map((teacher) => [teacher.placa, teacher.label]));
  const ids = new Set([...labels.keys(), ...guardCounts.value.keys()]);
  const viewer = nameSignature(viewerName.value);
  return Array.from(ids, (teacherId) => {
    const count = normalizeGuardCount(guardCounts.value.get(teacherId));
    const label = labels.get(teacherId) || teacherId;
    return {
      teacherId,
      label,
      ...count,
      mine: Boolean(viewer && viewer === nameSignature(label)),
    };
  }).sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true }));
});

const myRow = computed(() => allRows.value.find((row) => row.mine));
const recordedRows = computed(() => allRows.value.filter((row) => row.total > 0));
const visibleRows = computed(() => {
  const term = normalize(query.value);
  return recordedRows.value.filter((row) => !term || normalize(`${row.label} ${row.teacherId}`).includes(term));
});
const totals = computed(() => recordedRows.value.reduce((result, row) => ({
  total: result.total + row.total,
  released: result.released + row.released,
  guard: result.guard + row.guard,
  other: result.other + row.other,
}), { total: 0, released: 0, guard: 0, other: 0 }));
</script>

<template>
  <section class="teacher-stats-panel no-print" aria-labelledby="teacher-stats-title">
    <header class="teacher-stats-head">
      <div>
        <p class="kicker">Curs {{ courseName }}</p>
        <h2 id="teacher-stats-title">Guàrdies realitzades</h2>
        <p>El recompte s’actualitza quan es tanca la jornada i separa l’origen de cada cobertura.</p>
      </div>
      <div class="teacher-stats-totals" aria-label="Resum del curs">
        <span><strong>{{ totals.released }}</strong> com a alliberat</span>
        <span><strong>{{ totals.guard }}</strong> en hora de G</span>
        <span><strong>{{ totals.total }}</strong> totals</span>
      </div>
    </header>

    <article v-if="myRow" class="my-guard-count">
      <span>El meu recompte</span>
      <strong>{{ myRow.total }}</strong>
      <small>{{ myRow.released }} com a alliberat · {{ myRow.guard }} en hora de G<span v-if="myRow.other"> · {{ myRow.other }} extraordinàries</span></small>
    </article>

    <div class="teacher-stats-toolbar">
      <label for="teacher-stats-search">Cerca professorat</label>
      <input id="teacher-stats-search" v-model="query" type="search" placeholder="Nom o codi…" />
    </div>

    <div v-if="visibleRows.length" class="teacher-stats-table" role="table" aria-label="Recompte de guàrdies realitzades">
      <div class="teacher-stats-row teacher-stats-columns" role="row">
        <span role="columnheader">Professorat</span>
        <span role="columnheader">Alliberat</span>
        <span role="columnheader">G</span>
        <span role="columnheader">Altres</span>
        <span role="columnheader">Total</span>
      </div>
      <div v-for="row in visibleRows" :key="row.teacherId" class="teacher-stats-row" :class="{ 'is-mine': row.mine }" role="row">
        <strong role="cell">{{ row.label }} <em v-if="row.mine">Jo</em></strong>
        <span role="cell" data-count-released>{{ row.released }}</span>
        <span role="cell" data-count-guard>{{ row.guard }}</span>
        <span role="cell" data-count-other>{{ row.other }}</span>
        <b role="cell" data-count-total>{{ row.total }}</b>
      </div>
    </div>
    <div v-else class="empty-small teacher-stats-empty">
      {{ recordedRows.length ? 'No hi ha resultats per a aquesta cerca.' : 'Encara no s’ha tancat cap jornada amb cobertures realitzades.' }}
    </div>
    <p class="teacher-stats-note">«Altres» inclou les assignacions extraordinàries de professorat que no estava ni de G ni alliberat.</p>
  </section>
</template>
