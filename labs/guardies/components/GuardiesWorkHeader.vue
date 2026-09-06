<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const {
  date, absencies, assignacions, dayStatus, dayPersistenceStatus,
  publishedAt, updatedAt, closedAt, canWrite, teacherView,
} = storeToRefs(store);

const xmlDay = computed(() => {
  if (!date.value) return '';
  const parsed = new Date(`${date.value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : String(parsed.getDay());
});

const selectedAbsences = computed(() => (
  Array.from(absencies.value.values()).filter((item) => item.dia === xmlDay.value)
));

const coverageLabel = computed(() => {
  const selected = selectedAbsences.value;
  const slots = new Set(selected.map((item) => item.hora)).size;
  const pending = selected.filter((item) => (
    !item.sessions?.some((session) => session.activitat === 'GP') && !assignacions.value.get(item.id)
  )).length;
  const plural = (value, singular, multiple) => `${value} ${value === 1 ? singular : multiple}`;
  return [
    plural(selected.length, 'sessió', 'sessions'),
    plural(slots, 'franja', 'franges'),
    plural(pending, 'pendent', 'pendents'),
  ].join(' · ');
});

function formatDate(value) {
  if (!value) return 'Sense data';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('ca-ES', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(parsed);
}

function formatTimestamp(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('ca-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function localDateString(value) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function onDateChange(event) {
  store.changeDate(event.target.value);
  window.dispatchEvent(new CustomEvent('guardies:legacy-render', { detail: { reloadDay: true } }));
}

function printCoverage() {
  window.print();
}

function clearDay() {
  store.clearAbsencePlan();
  store.clearGroupsOut();
  window.dispatchEvent(new CustomEvent('guardies:legacy-render'));
}

const statusLabel = computed(() => ({ draft: 'Esborrany', unpublished: 'No publicada', published: 'Publicada', closed: 'Tancada' }[dayStatus.value] || 'No publicada'));
const saveLabel = computed(() => {
  if (teacherView.value) return ({
    loading: 'Carregant…', error: 'Error de lectura', ready: 'Sincronitzat', idle: 'Sincronitzat',
  }[dayPersistenceStatus.value] || 'Sincronitzat');
  return ({
    loading: 'Carregant…', saving: 'Desant…', error: 'Error en desar', ready: 'Desat', idle: 'Desat',
  }[dayPersistenceStatus.value] || 'Desat');
});

function changeStatus(action) {
  window.dispatchEvent(new CustomEvent('guardies:day-action', { detail: { action } }));
}
</script>

<template>
  <header class="work-header no-print">
    <div class="work-title">
      <p class="kicker">{{ teacherView ? 'Consulta diària' : 'Control diari' }}</p>
      <h1>{{ teacherView ? 'Guàrdies publicades' : 'Guàrdies' }}</h1>
    </div>

    <div class="date-dock">
      <label class="date-field" for="date-input">
        <span>{{ teacherView ? 'Dia de consulta' : 'Dia de treball' }}</span>
        <input id="date-input" type="date" :value="date" @change="onDateChange" />
      </label>
      <div id="date-label" class="date-summary-card">
        <span>{{ teacherView ? 'Dia seleccionat' : 'Dia preparat' }}</span>
        <strong>{{ formatDate(date) }}</strong>
        <em v-if="!['1', '2', '3', '4', '5'].includes(xmlDay)">Sense horari lectiu al GPU001</em>
      </div>
      <div id="today-info" class="date-summary-card today-info">
        <span>Avui</span>
        <strong>{{ formatDate(localDateString(new Date())) }}</strong>
      </div>
    </div>

    <div class="day-command-bar">
      <div class="day-state" :class="`is-${dayStatus}`">
        <span class="day-state-dot" aria-hidden="true"></span>
        <strong>{{ statusLabel }}</strong>
        <small>{{ saveLabel }}</small>
      </div>
      <span id="coverage-count" class="pill">{{ coverageLabel }}</span>
      <button v-if="canWrite && dayStatus === 'draft'" type="button" :disabled="dayPersistenceStatus === 'saving' || !selectedAbsences.length" @click="changeStatus('publish')">Publica</button>
      <button v-if="canWrite && dayStatus === 'published'" type="button" class="close-day" :disabled="dayPersistenceStatus === 'saving'" @click="changeStatus('close')">Tanca jornada</button>
      <button v-if="canWrite && dayStatus === 'closed'" type="button" class="ghost" :disabled="dayPersistenceStatus === 'saving'" @click="changeStatus('reopen')">Reobre</button>
      <button id="print-coverage" type="button" class="ghost" :disabled="!selectedAbsences.length" @click="printCoverage">Imprimeix A4</button>
      <button v-if="canWrite" id="clear-day-list" type="button" class="ghost" :disabled="dayStatus === 'closed' || !selectedAbsences.length" @click="clearDay">Neteja dia</button>
    </div>
    <p v-if="publishedAt || updatedAt || closedAt" class="day-audit">
      <span v-if="publishedAt">Publicada {{ formatTimestamp(publishedAt) }}</span>
      <span v-if="dayStatus === 'published' && updatedAt">Actualitzada {{ formatTimestamp(updatedAt) }}</span>
      <span v-if="closedAt">Tancada {{ formatTimestamp(closedAt) }}</span>
    </p>
  </header>
</template>
