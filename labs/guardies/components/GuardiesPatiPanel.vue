<script setup>
import { computed, ref, watch } from 'vue';
import { useGuardiesStore } from '../stores/guardies';
import { saveGuardiesPati } from '../../../src/services/guardiesStorage';
import {
  WEEKDAYS,
  addDays,
  nonTeachingReason,
  normalizePatioConfig,
  officialSchoolCalendar,
  patioAssignmentsForDate,
  schoolYearStart,
  weekDates,
} from '../../../src/modules/guardies/domain/patio';

const state = useGuardiesStore();
const activeDay = ref('1');
const saving = ref(false);
const saveMessage = ref('');
const holidayDate = ref('');
const holidayLabel = ref('');
const selectedTeacher = ref('');
const weekAnchor = ref(state.date);
let seededFromUntis = false;

function detectedStartYear() {
  return schoolYearStart(state.referencia?.any || state.courseName || state.courseId);
}

const draft = ref(normalizePatioConfig({}, { startYear: detectedStartYear() }));

function cloneConfig(value) {
  return normalizePatioConfig(value || {}, { startYear: value?.startYear || detectedStartYear() });
}

function teacherLabel(teacherId) {
  return state.professorOptions.find((teacher) => teacher.placa === teacherId)?.label
    || teacherId
    || 'Professor sense nom';
}

function gpTeacherIds(dayId) {
  return Array.from(new Set(state.sessions
    .filter((session) => session.dia === dayId && session.activitat === 'GP')
    .map((session) => session.placa)
    .filter(Boolean)));
}

function seedDetectedTeachers() {
  if (seededFromUntis || state.patiConfig) return;
  if (!state.sessions.length) return;
  const hasAny = WEEKDAYS.some(({ id }) => draft.value.weekdayTeachers[id].length);
  if (hasAny) return;
  WEEKDAYS.forEach(({ id }) => {
    draft.value.weekdayTeachers[id] = gpTeacherIds(id).map((teacherId, index) => ({
      teacherId,
      startZoneId: draft.value.zones[index % Math.max(1, draft.value.zones.length)]?.id || '',
    }));
  });
  seededFromUntis = true;
}

watch(() => state.patiConfig, (value) => {
  if (value) {
    draft.value = cloneConfig(value);
    seededFromUntis = true;
  } else {
    draft.value = cloneConfig({ startYear: detectedStartYear() });
    seededFromUntis = false;
    seedDetectedTeachers();
  }
}, { immediate: true, deep: true });

watch(() => [state.sessions.length, state.referencia?.any], () => {
  if (!state.patiConfig && draft.value.startYear !== detectedStartYear()) {
    draft.value = cloneConfig({ startYear: detectedStartYear() });
  }
  seedDetectedTeachers();
});

watch(() => state.date, (value) => {
  if (value) weekAnchor.value = value;
});

const official = computed(() => officialSchoolCalendar(draft.value.startYear));
const selectedRoster = computed(() => draft.value.weekdayTeachers[activeDay.value] || []);
const detectedForActiveDay = computed(() => new Set(gpTeacherIds(activeDay.value)));
const selectableTeachers = computed(() => {
  const selected = new Set(selectedRoster.value.map((item) => item.teacherId));
  const detected = detectedForActiveDay.value;
  return state.professorOptions
    .filter((teacher) => !selected.has(teacher.placa))
    .sort((a, b) => {
      const detection = Number(detected.has(b.placa)) - Number(detected.has(a.placa));
      return detection || a.label.localeCompare(b.label, 'ca', { numeric: true });
    });
});
const previewDates = computed(() => weekDates(weekAnchor.value));
const configuredTeacherCount = computed(() => WEEKDAYS.reduce(
  (total, day) => total + draft.value.weekdayTeachers[day.id].length,
  0,
));

function uniqueZoneId() {
  let index = draft.value.zones.length + 1;
  while (draft.value.zones.some((zone) => zone.id === `zona-${index}`)) index += 1;
  return `zona-${index}`;
}

function addZone() {
  const id = uniqueZoneId();
  draft.value.zones.push({ id, name: `Zona ${draft.value.zones.length + 1}` });
  WEEKDAYS.forEach(({ id: dayId }) => {
    draft.value.weekdayTeachers[dayId].forEach((teacher, index) => {
      if (!teacher.startZoneId) teacher.startZoneId = draft.value.zones[index % draft.value.zones.length].id;
    });
  });
}

function removeZone(zoneId) {
  draft.value.zones = draft.value.zones.filter((zone) => zone.id !== zoneId);
  WEEKDAYS.forEach(({ id }) => {
    draft.value.weekdayTeachers[id].forEach((teacher, index) => {
      if (teacher.startZoneId === zoneId) {
        teacher.startZoneId = draft.value.zones[index % Math.max(1, draft.value.zones.length)]?.id || '';
      }
    });
  });
}

function addTeacher() {
  const teacherId = selectedTeacher.value;
  if (!teacherId || selectedRoster.value.some((teacher) => teacher.teacherId === teacherId)) return;
  selectedRoster.value.push({
    teacherId,
    startZoneId: draft.value.zones[selectedRoster.value.length % Math.max(1, draft.value.zones.length)]?.id || '',
  });
  selectedTeacher.value = '';
}

function removeTeacher(teacherId) {
  draft.value.weekdayTeachers[activeDay.value] = selectedRoster.value
    .filter((teacher) => teacher.teacherId !== teacherId);
}

function importDetectedTeachers() {
  const existing = new Set(selectedRoster.value.map((teacher) => teacher.teacherId));
  gpTeacherIds(activeDay.value).forEach((teacherId) => {
    if (existing.has(teacherId)) return;
    selectedRoster.value.push({
      teacherId,
      startZoneId: draft.value.zones[selectedRoster.value.length % Math.max(1, draft.value.zones.length)]?.id || '',
    });
    existing.add(teacherId);
  });
}

function addHoliday() {
  if (!holidayDate.value) return;
  const existing = draft.value.customHolidays.find((holiday) => holiday.date === holidayDate.value);
  if (existing) existing.label = holidayLabel.value.trim() || existing.label;
  else draft.value.customHolidays.push({
    date: holidayDate.value,
    label: holidayLabel.value.trim() || 'Dia no lectiu del centre',
  });
  draft.value.customHolidays.sort((a, b) => a.date.localeCompare(b.date));
  holidayDate.value = '';
  holidayLabel.value = '';
}

function formatDate(value, withWeekday = false) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('ca-ES', {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function previewFor(date) {
  return {
    reason: nonTeachingReason(date, draft.value),
    assignments: patioAssignmentsForDate(date, draft.value),
  };
}

function moveWeek(amount) {
  weekAnchor.value = addDays(previewDates.value[0], amount * 7);
}

async function save() {
  if (!state.canWrite || saving.value) return;
  saving.value = true;
  saveMessage.value = '';
  try {
    const clean = await saveGuardiesPati(state.courseId, draft.value);
    state.patiConfig = clean;
    draft.value = cloneConfig(clean);
    saveMessage.value = 'Configuració desada';
    window.dispatchEvent(new CustomEvent('guardies:pati-updated'));
  } catch (error) {
    saveMessage.value = `No s'ha pogut desar: ${error.message || error}`;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <details id="pati-panel" class="admin-panel pati-panel no-print">
    <summary>
      <span class="admin-summary-title">
        <span class="admin-icon" aria-hidden="true">◎</span>
        <strong>Patis i rotació de zones</strong>
      </span>
      <span class="cache-info">{{ draft.zones.length }} zones · {{ configuredTeacherCount }} torns setmanals</span>
    </summary>

    <div class="pati-admin-grid">
      <section class="admin-block pati-zones-block">
        <div class="admin-block-head">
          <div>
            <p class="kicker">1 · Espais</p>
            <h2>Zones de pati</h2>
          </div>
          <button v-if="state.canWrite" id="add-pati-zone" type="button" class="ghost" @click="addZone">Afegeix zona</button>
        </div>
        <p class="hint tight">L'ordre defineix el recorregut. Després de la darrera zona, la rotació torna a la primera.</p>
        <div v-if="draft.zones.length" class="pati-zone-list">
          <div v-for="(zone, index) in draft.zones" :key="zone.id" class="pati-zone-row">
            <span>{{ index + 1 }}</span>
            <input v-model.trim="zone.name" :aria-label="`Nom de la zona ${index + 1}`" :disabled="!state.canWrite" maxlength="80" />
            <button v-if="state.canWrite" type="button" class="icon-remove" :aria-label="`Elimina ${zone.name}`" @click="removeZone(zone.id)">×</button>
          </div>
        </div>
        <div v-else class="empty-small">Afegeix les zones en l'ordre en què les recorrerà el professorat.</div>
      </section>

      <section class="admin-block pati-roster-block">
        <div class="admin-block-head">
          <div>
            <p class="kicker">2 · Professorat</p>
            <h2>GP de cada dia</h2>
          </div>
          <button v-if="state.canWrite" type="button" class="ghost" @click="importDetectedTeachers">Importa GP d'Untis</button>
        </div>
        <div class="pati-day-tabs" role="tablist" aria-label="Dia de la setmana">
          <button
            v-for="day in WEEKDAYS"
            :key="day.id"
            type="button"
            role="tab"
            :aria-selected="activeDay === day.id"
            :class="{ active: activeDay === day.id }"
            @click="activeDay = day.id; selectedTeacher = ''"
          >
            {{ day.short }} <span>{{ draft.weekdayTeachers[day.id].length }}</span>
          </button>
        </div>
        <div v-if="state.canWrite" class="pati-add-teacher">
          <select id="pati-teacher-select" v-model="selectedTeacher" aria-label="Professor que fa guàrdia de pati">
            <option value="">Selecciona professor...</option>
            <option v-for="teacher in selectableTeachers" :key="teacher.placa" :value="teacher.placa">
              {{ detectedForActiveDay.has(teacher.placa) ? 'GP Untis · ' : '' }}{{ teacher.label }}
            </option>
          </select>
          <button id="add-pati-teacher" type="button" :disabled="!selectedTeacher" @click="addTeacher">Afegeix</button>
        </div>
        <div v-if="selectedRoster.length" class="pati-roster-list">
          <div v-for="teacher in selectedRoster" :key="teacher.teacherId" class="pati-roster-row">
            <div>
              <strong>{{ teacherLabel(teacher.teacherId) }}</strong>
              <span v-if="detectedForActiveDay.has(teacher.teacherId)" class="source-chip">GP a Untis</span>
            </div>
            <label>
              Zona inicial
              <select v-model="teacher.startZoneId" :disabled="!state.canWrite || !draft.zones.length">
                <option value="">Automàtica</option>
                <option v-for="zone in draft.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
              </select>
            </label>
            <button v-if="state.canWrite" type="button" class="icon-remove" :aria-label="`Elimina ${teacherLabel(teacher.teacherId)}`" @click="removeTeacher(teacher.teacherId)">×</button>
          </div>
        </div>
        <div v-else class="empty-small">Aquest dia encara no té professorat de GP.</div>
      </section>

      <section class="admin-block pati-calendar-block">
        <div class="admin-block-head">
          <div>
            <p class="kicker">3 · Calendari</p>
            <h2>Dies no lectius</h2>
          </div>
          <a
            v-if="official.sourceUrl"
            class="source-chip official"
            :href="official.sourceUrl"
            target="_blank"
            rel="noreferrer"
          >CAIB {{ draft.startYear }}–{{ draft.startYear + 1 }} ↗</a>
          <span v-else class="source-chip official">Calendari pendent de validar</span>
        </div>
        <p class="hint tight">El calendari oficial ja està incorporat. Afegeix aquí els festius locals, dies de lliure disposició i altres dies propis del centre.</p>
        <div class="official-calendar-summary">
          <span>{{ formatDate(official.courseStart) }}–{{ formatDate(official.courseEnd) }}</span>
          <span v-for="range in official.ranges" :key="range.start">{{ range.label }} · {{ formatDate(range.start) }}–{{ formatDate(range.end) }}</span>
          <span v-for="holiday in official.dates.filter((item) => !official.ranges.some((range) => item.date >= range.start && item.date <= range.end))" :key="holiday.date">{{ formatDate(holiday.date) }} · {{ holiday.label }}</span>
        </div>
        <div v-if="state.canWrite" class="pati-holiday-form">
          <input id="pati-holiday-date" v-model="holidayDate" type="date" :min="draft.courseStart" :max="draft.courseEnd" aria-label="Data no lectiva" />
          <input id="pati-holiday-label" v-model="holidayLabel" type="text" placeholder="Motiu (p. ex. lliure disposició)" aria-label="Motiu del dia no lectiu" />
          <button id="add-pati-holiday" type="button" :disabled="!holidayDate" @click="addHoliday">Afegeix</button>
        </div>
        <div v-if="draft.customHolidays.length" class="custom-holiday-list">
          <span v-for="holiday in draft.customHolidays" :key="holiday.date">
            <strong>{{ formatDate(holiday.date, true) }}</strong> {{ holiday.label }}
            <button v-if="state.canWrite" type="button" :aria-label="`Elimina el dia ${holiday.date}`" @click="draft.customHolidays = draft.customHolidays.filter((item) => item.date !== holiday.date)">×</button>
          </span>
        </div>
      </section>

      <section class="admin-block pati-preview-block">
        <div class="admin-block-head">
          <div>
            <p class="kicker">4 · Resultat</p>
            <h2>Previsualització setmanal</h2>
          </div>
          <div class="week-nav">
            <button type="button" class="ghost" aria-label="Setmana anterior" @click="moveWeek(-1)">←</button>
            <button type="button" class="ghost" @click="weekAnchor = state.date">Avui</button>
            <button type="button" class="ghost" aria-label="Setmana següent" @click="moveWeek(1)">→</button>
          </div>
        </div>
        <div class="pati-week-preview">
          <article v-for="(date, index) in previewDates" :key="date" :class="['pati-day-card', { holiday: previewFor(date).reason }]">
            <header>
              <strong>{{ WEEKDAYS[index].short }}</strong>
              <span>{{ formatDate(date) }}</span>
            </header>
            <p v-if="previewFor(date).reason" class="non-teaching-label">{{ previewFor(date).reason.label }}</p>
            <div v-else-if="previewFor(date).assignments.length" class="pati-preview-assignments">
              <span v-for="assignment in previewFor(date).assignments" :key="assignment.teacherId">
                <strong>{{ assignment.zoneName }}</strong>
                {{ teacherLabel(assignment.teacherId) }}
              </span>
            </div>
            <p v-else class="pati-no-roster">Sense GP configurada</p>
          </article>
        </div>
      </section>
    </div>

    <footer class="pati-save-bar">
      <p>
        <strong>Els patis són informatius.</strong>
        No creen substitucions; els festius no consumeixen cap pas de la rotació.
      </p>
      <span v-if="saveMessage" :class="['pati-save-message', { error: saveMessage.startsWith('No') }]">{{ saveMessage }}</span>
      <button v-if="state.canWrite" id="save-pati-config" type="button" :disabled="saving" @click="save">
        {{ saving ? 'Desant…' : 'Desa la configuració de pati' }}
      </button>
    </footer>
  </details>
</template>
