<script setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { date, dayStatus, canWrite } = storeToRefs(store);
const absenceFrom = ref(date.value);
const absenceTo = ref(date.value);
const outingFrom = ref(date.value);
const outingTo = ref(date.value);
const wholeGroup = ref(true);

watch(date, (value) => {
  absenceFrom.value = value;
  absenceTo.value = value;
  outingFrom.value = value;
  outingTo.value = value;
});

watch(wholeGroup, (value) => {
  window.dispatchEvent(new CustomEvent('guardies:outing-completeness', { detail: { wholeGroup: value } }));
}, { immediate: true });

function applyAbsenceRange() {
  window.dispatchEvent(new CustomEvent('guardies:apply-absence-range', {
    detail: { from: absenceFrom.value, to: absenceTo.value },
  }));
}

function applyOutingRange() {
  window.dispatchEvent(new CustomEvent('guardies:apply-outing-range', {
    detail: { from: outingFrom.value, to: outingTo.value, wholeGroup: wholeGroup.value },
  }));
}
</script>

<template>
  <aside class="entry-panel no-print">
    <div class="entry-head">
      <div>
        <p class="kicker">Entrada</p>
        <h2>Incidències</h2>
      </div>
      <div class="mode-tabs" role="tablist" aria-label="Tipus d'incidència">
        <button
          type="button"
          class="mode-tab active"
          role="tab"
          aria-selected="true"
          aria-controls="professor-mode"
          data-intake-mode="professor"
        >
          Professor
        </button>
        <button
          type="button"
          class="mode-tab"
          role="tab"
          aria-selected="false"
          aria-controls="group-mode"
          data-intake-mode="group"
        >
          Grup de sortida
        </button>
      </div>
    </div>

    <section id="professor-mode" class="mode-panel" role="tabpanel" data-mode-panel="professor">
      <div class="teacher-search">
        <label for="professor-search">Professor absent</label>
        <input id="professor-search" type="search" autocomplete="off" placeholder="Cerca professor..." />
        <select id="professor-select" class="hidden"></select>
        <strong id="selected-professor-label" class="hidden">Cap professor</strong>
        <div id="professor-results" class="search-results" aria-label="Resultats de professorat"></div>
      </div>

      <div class="mode-panel-head">
        <h3 id="schedule-title">Sessions del professor</h3>
        <div class="schedule-actions">
          <button id="add-all-hours" type="button" class="ghost">Tot el dia</button>
          <button id="clear-missing" type="button" class="ghost">Neteja</button>
        </div>
      </div>
      <div id="schedule-grid" class="schedule-grid"></div>
      <div class="range-builder">
        <div class="range-copy">
          <strong>Aplica a un interval</strong>
          <small>Replica les sessions marcades als dies lectius compresos.</small>
        </div>
        <label>Des de <input v-model="absenceFrom" type="date" /></label>
        <label>Fins a <input v-model="absenceTo" type="date" /></label>
        <button type="button" :disabled="!canWrite || dayStatus === 'closed'" @click="applyAbsenceRange">Aplica interval</button>
      </div>
    </section>

    <section id="group-mode" class="mode-panel hidden" role="tabpanel" data-mode-panel="group">
      <div class="group-picker">
        <label for="group-search">Grup de sortida</label>
        <div class="group-search-row">
          <select id="group-search">
            <option value="">Selecciona grup...</option>
          </select>
          <button id="add-group" type="button" disabled>+ Afegeix al dia</button>
        </div>
        <label class="whole-group-toggle">
          <input v-model="wholeGroup" type="checkbox" />
          <span><strong>Surt tot el grup</strong><small>Si és parcial, cap professor queda alliberat.</small></span>
        </label>
        <div class="outing-range">
          <label>Des de <input v-model="outingFrom" type="date" /></label>
          <label>Fins a <input v-model="outingTo" type="date" /></label>
          <button type="button" class="ghost" :disabled="!canWrite || dayStatus === 'closed'" @click="applyOutingRange">Replica la sortida</button>
        </div>
        <div class="group-selection-head">
          <span id="released-count" class="pill">0 professors</span>
          <button id="clear-groups" type="button" class="ghost">Treu tots</button>
        </div>
        <div id="selected-groups" class="selected-groups" aria-label="Grups seleccionats"></div>
      </div>

      <details class="released-disclosure">
        <summary>Professorat alliberat</summary>
        <div id="released-list" class="released-list"></div>
      </details>
    </section>
  </aside>
</template>
