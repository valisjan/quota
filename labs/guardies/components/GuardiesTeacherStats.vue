<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { guardCountForSlot, guardSlotKey, normalizeGuardCount } from '../../../src/modules/guardies/domain/workflow.js';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { guardCounts, professorOptions, courseName, viewerName, sessions, guardiaCodes } = storeToRefs(store);
const query = ref('');
const selectedSlot = ref('');

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

const dayLabels = { 1: 'Dilluns', 2: 'Dimarts', 3: 'Dimecres', 4: 'Dijous', 5: 'Divendres' };
const slotOptions = computed(() => {
  const hours = Array.from(new Set(sessions.value.map((session) => session.hora).filter((hour) => hour && hour !== 'PATI')))
    .sort((a, b) => String(a).localeCompare(String(b), 'ca', { numeric: true }));
  const hourNumber = new Map(hours.map((hour, index) => [hour, index + 1]));
  const slots = new Map();
  sessions.value.filter((session) => (
    session.dia >= '1' && session.dia <= '5'
    && session.hora !== 'PATI'
    && (session.activitatEsGuardiaGeneral || guardiaCodes.value.has(session.activitat))
  )).forEach((session) => {
    const key = guardSlotKey(session.dia, session.hora);
    slots.set(key, {
      key,
      day: session.dia,
      hour: session.hora,
      period: `${hourNumber.get(session.hora)}a`,
      label: `${dayLabels[session.dia]} · ${hourNumber.get(session.hora)}a · ${session.hora}`,
    });
  });
  return Array.from(slots.values()).sort((a, b) => (
    Number(a.day) - Number(b.day)
    || String(a.hour).localeCompare(String(b.hour), 'ca', { numeric: true })
  ));
});
const selectedSlotLabel = computed(() => slotOptions.value.find((slot) => slot.key === selectedSlot.value)?.label || 'Franja');

watch(slotOptions, (options) => {
  if (!options.some((option) => option.key === selectedSlot.value)) selectedSlot.value = options[0]?.key || '';
}, { immediate: true });

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
      guardInSlot: guardCountForSlot(count, selectedSlot.value),
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
  released: result.released + row.released,
  guardInSlot: result.guardInSlot + row.guardInSlot,
  other: result.other + row.other,
}), { released: 0, guardInSlot: 0, other: 0 }));

const guardRoster = computed(() => {
  const teachers = new Map(professorOptions.value.map((teacher) => [teacher.placa, teacher.label]));
  const viewer = nameSignature(viewerName.value);
  let previousDay = '';
  return slotOptions.value.map((slot) => {
    const teacherIds = new Set(sessions.value.filter((session) => (
      session.dia === slot.day
      && session.hora === slot.hour
      && (session.activitatEsGuardiaGeneral || guardiaCodes.value.has(session.activitat))
      && teachers.has(session.placa)
    )).map((session) => session.placa));
    const row = {
      ...slot,
      startsDay: previousDay !== slot.day,
      teachers: Array.from(teacherIds, (teacherId) => ({
        teacherId,
        label: teachers.get(teacherId) || teacherId,
        count: guardCountForSlot(guardCounts.value.get(teacherId), slot.key),
        mine: Boolean(viewer && viewer === nameSignature(teachers.get(teacherId) || teacherId)),
      })).sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true })),
    };
    previousDay = slot.day;
    return row;
  });
});
</script>

<template>
  <section class="teacher-stats-panel no-print" aria-labelledby="teacher-stats-title">
    <header class="teacher-stats-head">
      <div>
        <p class="kicker">Curs {{ courseName }}</p>
        <h2 id="teacher-stats-title">Guàrdies realitzades</h2>
      </div>
      <div class="teacher-stats-totals" aria-label="Resum del curs">
        <span><strong>{{ totals.released }}</strong> com a alliberat</span>
        <span><strong>{{ totals.guardInSlot }}</strong> G · {{ selectedSlotLabel }}</span>
      </div>
    </header>

    <article v-if="myRow" class="my-guard-count">
      <span>El meu recompte</span>
      <strong>{{ myRow.guardInSlot }}</strong>
      <small>{{ myRow.released }} com a alliberat · {{ myRow.guardInSlot }} G en aquesta franja<span v-if="myRow.other"> · {{ myRow.other }} extraordinàries</span></small>
    </article>

    <div class="teacher-stats-toolbar">
      <label for="teacher-stats-slot">Franja de G</label>
      <select id="teacher-stats-slot" v-model="selectedSlot" :disabled="!slotOptions.length">
        <option v-for="slot in slotOptions" :key="slot.key" :value="slot.key">{{ slot.label }}</option>
      </select>
      <label for="teacher-stats-search">Cerca professorat</label>
      <input id="teacher-stats-search" v-model="query" type="search" placeholder="Nom o codi…" />
    </div>

    <div v-if="visibleRows.length" class="teacher-stats-table" role="table" aria-label="Recompte de guàrdies realitzades">
      <div class="teacher-stats-row teacher-stats-columns" role="row">
        <span role="columnheader">Professorat</span>
        <span role="columnheader">Alliberat · curs</span>
        <span role="columnheader">G · franja</span>
        <span role="columnheader">Altres</span>
      </div>
      <div v-for="row in visibleRows" :key="row.teacherId" class="teacher-stats-row" :class="{ 'is-mine': row.mine }" role="row">
        <strong role="cell">{{ row.label }} <em v-if="row.mine">Jo</em></strong>
        <span role="cell" data-count-released>{{ row.released }}</span>
        <span role="cell" data-count-guard>{{ row.guardInSlot }}</span>
        <span role="cell" data-count-other>{{ row.other }}</span>
      </div>
    </div>
    <div v-else class="empty-small teacher-stats-empty">
      {{ recordedRows.length ? 'No hi ha resultats per a aquesta cerca.' : 'Encara no s’ha tancat cap jornada amb cobertures realitzades.' }}
    </div>

    <section class="guard-roster-panel" aria-labelledby="guard-roster-title">
      <header class="guard-roster-head">
        <h3 id="guard-roster-title">Recompte complet per franges</h3>
        <span>{{ guardRoster.length }} franges</span>
      </header>
      <div v-if="guardRoster.length" class="guard-roster-table" role="table" aria-label="Professorat de guàrdia i cobertures per franja">
        <div class="guard-roster-row guard-roster-columns" role="row">
          <span role="columnheader">Franja</span>
          <span role="columnheader">Professorat de G</span>
        </div>
        <div
          v-for="slot in guardRoster"
          :key="slot.key"
          class="guard-roster-row"
          :class="{ 'starts-day': slot.startsDay }"
          :data-roster-slot="slot.key"
          role="row"
        >
          <div class="guard-roster-slot" role="cell">
            <strong>{{ dayLabels[slot.day] }} · {{ slot.period }}</strong>
            <small>{{ slot.hour }}</small>
          </div>
          <div class="guard-roster-teachers" role="cell">
            <article
              v-for="teacher in slot.teachers"
              :key="teacher.teacherId"
              class="guard-roster-teacher"
              :class="{ 'is-mine': teacher.mine }"
              :data-roster-teacher="teacher.teacherId"
            >
              <span>{{ teacher.label }}</span>
              <b data-roster-count :aria-label="`${teacher.count} guàrdies realitzades`">{{ teacher.count }}</b>
            </article>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
