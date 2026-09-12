<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { signInGuardies } from '../../src/services/guardiesStorage.js';
import {
  DEFAULT_SCREEN_CONFIG,
  DEFAULT_SCREEN_ID,
  isPantallesAdmin,
  saveScreenConfig,
  subscribePublicGuardiesDay,
  subscribeScreenConfig,
} from '../../src/services/pantallesStorage.js';

const params = new URLSearchParams(window.location.search);
const screenId = params.get('pantalla') || DEFAULT_SCREEN_ID;
const managementMode = params.get('gestio') === '1';
const queryCourse = params.get('curs') || '';
const queryDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : '';

const config = reactive({ ...DEFAULT_SCREEN_CONFIG });
const day = ref(null);
const loadingConfig = ref(true);
const loadingDay = ref(true);
const connected = ref(navigator.onLine);
const localDate = ref('');
const localScale = ref(null);
const configExists = ref(false);
const adminReady = ref(!managementMode);
const adminAllowed = ref(false);
const signingIn = ref(false);
const saveState = ref('idle');
const errorMessage = ref('');
const activeViewIndex = ref(0);
const editingViewId = ref('');
const clock = ref(new Date());
let unsubscribeConfig = () => {};
let unsubscribeDay = () => {};
let saveTimer = null;
let idleTimer = null;
let rotationTimer = null;
let clockTimer = null;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const value = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${value}`;
}

function shiftIsoDate(value, amount) {
  const [year, month, date] = String(value).split('-').map(Number);
  const next = new Date(year, month - 1, date + amount, 12);
  return localDateString(next);
}

function configuredDate() {
  if (queryDate) return queryDate;
  if (config.dateMode === 'specific' && /^\d{4}-\d{2}-\d{2}$/.test(config.selectedDate || '')) {
    return config.selectedDate;
  }
  const today = localDateString();
  return config.dateMode === 'tomorrow' ? shiftIsoDate(today, 1) : today;
}

const selectedDate = computed(() => localDate.value || configuredDate());
const selectedCourse = computed(() => queryCourse || config.courseId || DEFAULT_SCREEN_CONFIG.courseId);
const activeScale = computed(() => localScale.value ?? config.scale ?? 100);
const views = computed(() => Array.isArray(config.views) ? config.views : []);
const editingView = computed(() => views.value.find((view) => view.id === editingViewId.value) || views.value[0] || null);
const activeView = computed(() => {
  if (managementMode) return editingView.value;
  const forced = views.value.find((view) => view.id === config.forcedViewId);
  return forced || views.value[activeViewIndex.value % Math.max(views.value.length, 1)] || null;
});
const enabledModules = computed(() => new Set(['guardies', 'pati', 'sortides']));
const isReady = computed(() => !loadingConfig.value && !loadingDay.value);
const hours = computed(() => Array.isArray(day.value?.hours) ? day.value.hours : []);
const outings = computed(() => Array.isArray(day.value?.groupsOut) ? day.value.groupsOut : []);
const formattedDate = computed(() => {
  const [year, month, date] = selectedDate.value.split('-').map(Number);
  return new Intl.DateTimeFormat('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(year, month - 1, date, 12));
});
const formattedTime = computed(() => new Intl.DateTimeFormat('ca-ES', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(clock.value));
const currentSession = computed(() => {
  const now = clock.value;
  if (now.getDay() === 0 || now.getDay() === 6) return 'Fora d’horari';
  const minutes = now.getHours() * 60 + now.getMinutes();
  const slots = [
    [480, 535, '1a hora'], [535, 590, '2a hora'], [590, 645, '3a hora'],
    [645, 675, 'Pati'], [675, 730, '4a hora'], [730, 785, '5a hora'],
    [785, 840, '6a hora'], [840, 895, '7a hora'],
  ];
  return slots.find(([start, end]) => minutes >= start && minutes < end)?.[2] || 'Fora d’horari';
});
const kioskUrl = computed(() => {
  const url = new URL('/labs/pantalles/', window.location.origin);
  url.searchParams.set('pantalla', screenId);
  return url.toString();
});

function isPatio(hour) {
  return hour?.key === 'PATI' || hour?.kind === 'patio';
}

function hourVisible(hour) {
  return isPatio(hour) ? enabledModules.value.has('pati') : enabledModules.value.has('guardies');
}

function resetLocalViewSoon() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    localDate.value = '';
    localScale.value = null;
  }, 90_000);
}

function shiftDay(amount) {
  localDate.value = shiftIsoDate(selectedDate.value, amount);
  resetLocalViewSoon();
}

function returnToday() {
  localDate.value = localDateString();
  resetLocalViewSoon();
}

function changeScale(amount) {
  localScale.value = Math.min(140, Math.max(80, activeScale.value + amount));
  resetLocalViewSoon();
}

function resetScale() {
  localScale.value = config.scale;
  resetLocalViewSoon();
}

function scheduleConfigSave() {
  if (!managementMode || !adminAllowed.value) return;
  window.clearTimeout(saveTimer);
  saveState.value = 'saving';
  saveTimer = window.setTimeout(async () => {
    try {
      await saveScreenConfig(screenId, { ...config });
      saveState.value = 'saved';
      errorMessage.value = '';
    } catch (error) {
      saveState.value = 'error';
      errorMessage.value = error?.message || String(error);
    }
  }, 350);
}

function uniqueViewId() {
  let number = views.value.length + 1;
  let id = `vista-${number}`;
  while (views.value.some((view) => view.id === id)) id = `vista-${++number}`;
  return id;
}

function addView() {
  const id = uniqueViewId();
  config.views.push({ id, name: `Vista ${config.views.length + 1}`, duration: 20, modules: ['guardies', 'pati', 'sortides'] });
  editingViewId.value = id;
  scheduleConfigSave();
}

function removeView(id) {
  if (config.views.length <= 1) return;
  const index = config.views.findIndex((view) => view.id === id);
  if (index < 0) return;
  config.views.splice(index, 1);
  if (config.forcedViewId === id) config.forcedViewId = '';
  editingViewId.value = config.views[Math.min(index, config.views.length - 1)].id;
  config.modules = [...(config.views[0]?.modules || [])];
  scheduleConfigSave();
}

function moveView(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= config.views.length) return;
  [config.views[index], config.views[target]] = [config.views[target], config.views[index]];
  config.modules = [...(config.views[0]?.modules || [])];
  scheduleConfigSave();
}

function scheduleRotation() {
  window.clearTimeout(rotationTimer);
  if (managementMode || config.forcedViewId || views.value.length < 2) return;
  const duration = Math.min(300, Math.max(5, Number(activeView.value?.duration) || 20));
  rotationTimer = window.setTimeout(() => {
    activeViewIndex.value = (activeViewIndex.value + 1) % views.value.length;
    scheduleRotation();
  }, duration * 1000);
}

async function copyKioskUrl() {
  await navigator.clipboard.writeText(kioskUrl.value);
  saveState.value = 'copied';
  window.setTimeout(() => { if (saveState.value === 'copied') saveState.value = 'saved'; }, 1500);
}

async function signIn() {
  signingIn.value = true;
  errorMessage.value = '';
  try {
    await signInGuardies();
    adminAllowed.value = await isPantallesAdmin();
  } catch (error) {
    errorMessage.value = error?.message || String(error);
  } finally {
    signingIn.value = false;
    adminReady.value = true;
  }
}

watch([selectedCourse, selectedDate], ([courseId, date]) => {
  unsubscribeDay();
  day.value = null;
  loadingDay.value = true;
  unsubscribeDay = subscribePublicGuardiesDay(courseId, date, (value) => {
    day.value = value;
    loadingDay.value = false;
    errorMessage.value = '';
  }, (error) => {
    loadingDay.value = false;
    errorMessage.value = error?.code === 'permission-denied'
      ? 'La pantalla encara no té accés a les jornades publicades.'
      : (error?.message || String(error));
  });
}, { immediate: true });

watch([views, () => config.forcedViewId, activeViewIndex], scheduleRotation, { deep: true });

onMounted(async () => {
  if (managementMode) {
    adminAllowed.value = await isPantallesAdmin().catch(() => false);
    adminReady.value = true;
  }
  unsubscribeConfig = subscribeScreenConfig(screenId, (next, exists) => {
    Object.assign(config, next);
    if (!config.views.some((view) => view.id === editingViewId.value)) editingViewId.value = config.views[0]?.id || '';
    activeViewIndex.value = 0;
    configExists.value = exists;
    localDate.value = '';
    localScale.value = null;
    loadingConfig.value = false;
  }, (error) => {
    loadingConfig.value = false;
    errorMessage.value = error?.message || String(error);
  });
  window.addEventListener('online', () => { connected.value = true; });
  window.addEventListener('offline', () => { connected.value = false; });
  clockTimer = window.setInterval(() => { clock.value = new Date(); }, 1000);
});

onBeforeUnmount(() => {
  unsubscribeConfig();
  unsubscribeDay();
  window.clearTimeout(saveTimer);
  window.clearTimeout(idleTimer);
  window.clearTimeout(rotationTimer);
  window.clearInterval(clockTimer);
});
</script>

<template>
  <main
    class="display-shell"
    :class="[`theme-${config.theme}`, { 'management-mode': managementMode }]"
    :style="{ '--display-scale': activeScale / 100 }"
  >
    <aside v-if="managementMode" class="management-panel">
      <template v-if="!adminReady">
        <div class="panel-loading"><span class="spinner"></span></div>
      </template>
      <template v-else-if="!adminAllowed">
        <img src="/logo_IESJSB_nav.png" alt="IES Josep Sureda i Blanes" />
        <h1>Gestió de pantalles</h1>
        <button type="button" :disabled="signingIn" @click="signIn">
          {{ signingIn ? 'Connectant…' : 'Inicia sessió com a administrador/a' }}
        </button>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
      </template>
      <template v-else>
        <div class="management-heading">
          <div>
            <span>Pantalla</span>
            <h1>{{ config.name }}</h1>
          </div>
          <span class="save-status">{{ saveState === 'saving' ? 'Desant…' : saveState === 'copied' ? 'URL copiada' : 'Desat' }}</span>
        </div>

        <label>Nom
          <input v-model="config.name" maxlength="80" @input="scheduleConfigSave" />
        </label>
        <label>Curs
          <input v-model="config.courseId" maxlength="20" @input="scheduleConfigSave" />
        </label>
        <div class="management-grid">
          <label>Dia mostrat
            <select v-model="config.dateMode" @change="scheduleConfigSave">
              <option value="today">Avui</option>
              <option value="tomorrow">Demà</option>
              <option value="specific">Data concreta</option>
            </select>
          </label>
          <label v-if="config.dateMode === 'specific'">Data
            <input v-model="config.selectedDate" type="date" @change="scheduleConfigSave" />
          </label>
        </div>
        <div class="management-grid">
          <label>Tema
            <select v-model="config.theme" @change="scheduleConfigSave">
              <option value="light">Clar</option>
              <option value="dark">Fosc</option>
            </select>
          </label>
          <label>Escala
            <select v-model.number="config.scale" @change="scheduleConfigSave">
              <option :value="90">90%</option>
              <option :value="100">100%</option>
              <option :value="110">110%</option>
              <option :value="120">120%</option>
              <option :value="130">130%</option>
            </select>
          </label>
        </div>
        <label>Avís temporal
          <textarea v-model="config.message" rows="3" maxlength="240" @input="scheduleConfigSave"></textarea>
        </label>

        <section class="view-manager">
          <div class="view-manager-heading">
            <div>
              <span>Vistes</span>
              <strong>{{ config.views.length }} {{ config.views.length === 1 ? 'vista' : 'vistes' }}</strong>
            </div>
            <button type="button" @click="addView">+ Afegeix</button>
          </div>

          <label>Què mostra la pantalla
            <select v-model="config.forcedViewId" @change="scheduleConfigSave">
              <option value="">Rotació automàtica</option>
              <option v-for="view in config.views" :key="view.id" :value="view.id">Només {{ view.name }}</option>
            </select>
          </label>

          <div class="view-list" role="tablist" aria-label="Vistes de la pantalla">
            <div v-for="(view, index) in config.views" :key="view.id" class="view-list-row" :class="{ selected: editingView?.id === view.id }">
              <button type="button" class="view-select" role="tab" :aria-selected="editingView?.id === view.id" @click="editingViewId = view.id">
                <strong>{{ view.name }}</strong>
                <span>{{ view.duration }} s</span>
              </button>
              <button type="button" class="icon-button" aria-label="Mou la vista cap amunt" :disabled="index === 0" @click="moveView(index, -1)">↑</button>
              <button type="button" class="icon-button" aria-label="Mou la vista cap avall" :disabled="index === config.views.length - 1" @click="moveView(index, 1)">↓</button>
            </div>
          </div>

          <div v-if="editingView" class="view-editor">
            <div class="management-grid">
              <label>Nom de la vista
                <input v-model="editingView.name" maxlength="60" @input="scheduleConfigSave" />
              </label>
              <label>Temps en pantalla
                <select v-model.number="editingView.duration" @change="scheduleConfigSave">
                  <option :value="10">10 segons</option>
                  <option :value="15">15 segons</option>
                  <option :value="20">20 segons</option>
                  <option :value="30">30 segons</option>
                  <option :value="60">1 minut</option>
                  <option :value="120">2 minuts</option>
                </select>
              </label>
            </div>

            <button v-if="config.views.length > 1" type="button" class="delete-view" @click="removeView(editingView.id)">Elimina aquesta vista</button>
          </div>
        </section>

        <label class="active-toggle">
          <input v-model="config.active" type="checkbox" @change="scheduleConfigSave" />
          Pantalla activa
        </label>
        <button type="button" class="secondary-button" @click="copyKioskUrl">Copia la URL del quiosc</button>
        <a class="management-back" href="/labs/guardies/">Torna a Guàrdies</a>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
      </template>
    </aside>

    <section class="kiosk-preview" aria-live="polite">
      <div v-if="!connected" class="connection-banner">Sense connexió · mostrant la darrera informació disponible</div>

      <div v-if="!config.active && !managementMode" class="inactive-screen">
        <img src="/logo_IESJSB_nav.png" alt="IES Josep Sureda i Blanes" />
        <p>Pantalla temporalment desactivada</p>
      </div>

      <template v-else>
        <header class="display-header">
          <div class="display-brand">
            <img src="/logo_IESJSB_nav.png" alt="" />
            <div>
              <span>IES Josep Sureda i Blanes</span>
              <h1>{{ activeView?.name || 'Pantalla informativa' }}</h1>
            </div>
          </div>
          <div class="display-date">
            <span>{{ config.name }}</span>
            <strong>{{ formattedDate }}</strong>
            <div class="live-clock">
              <strong>{{ formattedTime }}</strong>
              <span>{{ currentSession }}</span>
            </div>
          </div>
        </header>

        <nav class="touch-toolbar" aria-label="Navegació del dia">
          <button type="button" aria-label="Dia anterior" @click="shiftDay(-1)">←</button>
          <button type="button" class="today-button" @click="returnToday">Avui</button>
          <button type="button" aria-label="Dia següent" @click="shiftDay(1)">→</button>
          <span class="toolbar-separator"></span>
          <button type="button" aria-label="Redueix el text" @click="changeScale(-10)">−</button>
          <button type="button" class="scale-button" @click="resetScale">{{ activeScale }}%</button>
          <button type="button" aria-label="Augmenta el text" @click="changeScale(10)">+</button>
        </nav>

        <p v-if="config.message" class="screen-message">{{ config.message }}</p>

        <section v-if="!isReady" class="display-loading">
          <span class="spinner"></span>
          <strong>Carregant la jornada…</strong>
        </section>

        <section v-else-if="!day" class="no-day">
          <div class="no-day-date">{{ formattedDate }}</div>
          <strong>Encara no hi ha cap jornada publicada</strong>
        </section>

        <div v-else class="day-content">
          <template v-for="hour in hours" :key="hour.key">
            <section v-if="hourVisible(hour)" class="hour-card" :class="{ 'patio-card': isPatio(hour), empty: !hour.rows?.length && !isPatio(hour) }">
              <header>
                <h2>{{ hour.label }}</h2>
                <span v-if="!isPatio(hour)">{{ hour.rows?.length ? `${hour.rows.length} ${hour.rows.length === 1 ? 'absència' : 'absències'}` : 'Sense absències' }}</span>
              </header>

              <div v-if="isPatio(hour)" class="patio-grid">
                <article v-for="zone in hour.patio?.zones || []" :key="`${zone.name}-${zone.teacher}`" :class="{ absent: zone.absent }">
                  <strong>{{ zone.name }}</strong>
                  <span>{{ zone.teacher }}</span>
                  <em v-if="zone.absent">Absent</em>
                </article>
                <p v-if="hour.patio?.observation" class="patio-observation">{{ hour.patio.observation }}</p>
              </div>

              <div v-else-if="hour.rows?.length" class="guard-list">
                <article v-for="row in hour.rows" :key="row.id" class="guard-row" :class="{ pending: !row.assigned, cancelled: row.cancelled }">
                  <div class="absent-person">
                    <span>Absència</span>
                    <strong>{{ row.absent }}</strong>
                  </div>
                  <div class="session-detail">
                    <strong>{{ row.group || row.subject }}</strong>
                    <span>{{ [row.subject !== row.group ? row.subject : '', row.room].filter(Boolean).join(' · ') }}</span>
                  </div>
                  <div class="assigned-person">
                    <span>{{ row.coTeacher ? 'Queda amb el grup' : 'Preassignació' }}</span>
                    <strong>{{ row.assigned || 'Sense cobrir' }}</strong>
                  </div>
                  <p v-if="row.comment" class="row-comment">{{ row.comment }}</p>
                </article>
              </div>
            </section>
          </template>

          <section v-if="enabledModules.has('sortides') && outings.length" class="outings-card">
            <header><h2>Grups de sortida</h2></header>
            <div>
              <article v-for="group in outings" :key="group.id">
                <strong>{{ group.label }}</strong>
                <span>{{ group.partial ? 'Sortida parcial' : 'Fora del centre' }}</span>
              </article>
            </div>
          </section>
        </div>

        <footer class="display-footer">
          <span :class="{ online: connected }"></span>
          <span>{{ connected ? 'Actualització automàtica' : 'Sense connexió' }}</span>
        </footer>
      </template>
    </section>
  </main>
</template>
