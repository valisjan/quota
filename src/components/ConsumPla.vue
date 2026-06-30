<template>
  <div class="sections space-y-5">
    <AdminSectionNav v-model="activeSection" :items="sectionItems" mode="panels" />

    <section v-show="activeSection === 'resum'" id="resum" class="admin-anchor-section card p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Control del pla gratuït</p>
          <h3 class="mt-1 text-lg font-bold text-slate-950">Consum i risc de quota</h3>
          <p class="mt-1 max-w-3xl text-sm text-slate-600">
            Estimació interna amb lectures agregades de Firestore i control manual dels comptadors oficials.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          :disabled="carregant"
          @click="actualitzarEstimacio"
        >
          {{ carregant ? 'Actualitzant...' : 'Actualitzar estimació' }}
        </button>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="card in cardsResum"
          :key="card.label"
          class="metric-card border-t-4"
          :class="card.class"
        >
          <p class="metric-label">{{ card.label }}</p>
          <p class="metric-value">{{ card.value }}</p>
          <p class="metric-detail">{{ card.detail }}</p>
        </div>
      </div>

      <div
        v-if="avisos.length"
        class="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        <p class="font-bold">Avisos</p>
        <ul class="mt-2 space-y-1">
          <li v-for="avis in avisos" :key="avis">{{ avis }}</li>
        </ul>
      </div>

      <p v-if="error" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
        {{ error }}
      </p>
      <p class="mt-3 text-xs font-medium text-slate-500">
        Última actualització: {{ ultimaActualitzacio || 'pendent' }}
      </p>
    </section>

    <section v-show="activeSection === 'firebase'" id="firebase" class="admin-anchor-section card">
      <div class="border-b border-slate-200 px-5 py-4">
        <h3 class="font-bold text-slate-950">Firebase Spark</h3>
        <p class="mt-1 text-sm text-slate-600">
          Quotes principals del projecte {{ firebaseProjectId }}.
        </p>
      </div>

      <div class="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-3">
          <div
            v-for="quota in firebaseQuotas"
            :key="quota.id"
            class="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-bold text-slate-950">{{ quota.label }}</p>
                <p class="mt-0.5 text-sm text-slate-600">{{ quota.limitLabel }}</p>
              </div>
              <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="estatQuota(quota).class">
                {{ estatQuota(quota).label }}
              </span>
            </div>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full" :class="estatQuota(quota).barClass" :style="{ width: `${percentQuota(quota)}%` }"></div>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <input
                v-model.number="consumManual[quota.id]"
                type="number"
                min="0"
                class="w-36 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
                @input="guardarConsumManual"
              />
              <span class="text-sm font-medium text-slate-600">{{ quota.unit }}</span>
              <span class="ml-auto text-sm font-semibold text-slate-700">
                queda {{ formatNumber(restantQuota(quota)) }} {{ quota.unit }}
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 class="font-bold text-slate-950">Documents estimats</h4>
          <p class="mt-1 text-sm text-slate-600">
            Conteig agregat, sense descarregar tots els documents.
          </p>
          <dl class="mt-4 divide-y divide-slate-200 text-sm">
            <div
              v-for="fila in filesConteig"
              :key="fila.key"
              class="flex items-center justify-between gap-4 py-2"
            >
              <dt class="font-medium text-slate-600">{{ fila.label }}</dt>
              <dd class="font-bold text-slate-950">{{ formatNumber(fila.count) }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section v-show="activeSection === 'netlify'" id="netlify" class="admin-anchor-section card">
      <div class="border-b border-slate-200 px-5 py-4">
        <h3 class="font-bold text-slate-950">Netlify</h3>
        <p class="mt-1 text-sm text-slate-600">
          Projecte {{ netlifySiteName }} · pla Free: 300 crèdits al mes.
        </p>
      </div>

      <div class="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-bold text-slate-950">Crèdits mensuals</p>
              <p class="mt-0.5 text-sm text-slate-600">Introdueix els crèdits usats del panell de Netlify.</p>
            </div>
            <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="estatNetlify.class">
              {{ estatNetlify.label }}
            </span>
          </div>
          <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full" :class="estatNetlify.barClass" :style="{ width: `${percentNetlify}%` }"></div>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <input
              v-model.number="netlifyCreditsUsed"
              type="number"
              min="0"
              class="w-36 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
              @input="guardarConsumManual"
            />
            <span class="text-sm font-medium text-slate-600">crèdits usats</span>
            <span class="ml-auto text-sm font-semibold text-slate-700">
              queda {{ formatNumber(netlifyCreditsLeft) }}
            </span>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="item in netlifyCostos"
            :key="item.label"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-black text-slate-950">{{ item.value }}</p>
            <p class="mt-1 text-sm font-medium text-slate-600">{{ item.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <section v-show="activeSection === 'enllacos'" id="enllacos" class="admin-anchor-section card p-5">
      <h3 class="font-bold text-slate-950">Panells oficials</h3>
      <p class="mt-1 text-sm text-slate-600">
        Els comptadors reals de facturació només són fiables als panells de cada proveïdor.
      </p>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-primary hover:bg-slate-50"
        >
          <span class="text-sm font-bold text-primary">{{ link.label }}</span>
          <span class="mt-1 block text-sm text-slate-600">{{ link.detail }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { collection, getCountFromServer } from 'firebase/firestore';
import AdminSectionNav from './AdminSectionNav.vue';
import { db } from '../firebase';
import { useCursStore } from '../stores/curs';

const STORAGE_KEY = 'quota_consum_plan_manual';
const firebaseProjectId = 'quota-e1424';
const netlifySiteName = 'chic-tartufo-68ee9c';
const netlifyCreditsLimit = 300;

const cursStore = useCursStore();
const activeSection = ref('resum');
const carregant = ref(false);
const error = ref('');
const ultimaActualitzacio = ref('');
const conteigs = ref([]);
const consumManual = reactive({
  firestoreReads: 0,
  firestoreWrites: 0,
  firestoreDeletes: 0,
  firestoreStorageMb: 0,
  firestoreEgressGb: 0,
});
const netlifyCreditsUsed = ref(0);

const sectionItems = [
  { id: 'resum', label: 'Resum', description: 'Risc i marge' },
  { id: 'firebase', label: 'Firebase', description: 'Firestore i Hosting' },
  { id: 'netlify', label: 'Netlify', description: 'Crèdits mensuals' },
  { id: 'enllacos', label: 'Panells', description: 'Facturació real' },
];

const firebaseQuotas = [
  { id: 'firestoreReads', label: 'Lectures Firestore', limit: 50000, unit: 'lectures', limitLabel: '50.000 lectures/dia' },
  { id: 'firestoreWrites', label: 'Escriptures Firestore', limit: 20000, unit: 'escriptures', limitLabel: '20.000 escriptures/dia' },
  { id: 'firestoreDeletes', label: 'Esborrats Firestore', limit: 20000, unit: 'esborrats', limitLabel: '20.000 esborrats/dia' },
  { id: 'firestoreStorageMb', label: 'Dades Firestore', limit: 1024, unit: 'MB', limitLabel: '1 GB total' },
  { id: 'firestoreEgressGb', label: 'Sortida Firestore', limit: 10, unit: 'GB', limitLabel: '10 GB/mes' },
];

const netlifyCostos = [
  { label: 'Deploy producció', value: '15', detail: 'crèdits per deploy' },
  { label: 'Amplada de banda', value: '20', detail: 'crèdits per GB' },
  { label: 'Peticions web', value: '2', detail: 'crèdits per 10k' },
];

const links = [
  {
    label: 'Firebase Usage',
    detail: 'Ús del projecte i productes Firebase.',
    href: `https://console.firebase.google.com/project/${firebaseProjectId}/usage`,
  },
  {
    label: 'Firestore Usage',
    detail: 'Lectures, escriptures, esborrats i emmagatzematge.',
    href: `https://console.firebase.google.com/project/${firebaseProjectId}/firestore/usage`,
  },
  {
    label: 'Google Cloud Billing',
    detail: 'Compte de facturació i pressupostos.',
    href: `https://console.cloud.google.com/billing?project=${firebaseProjectId}`,
  },
  {
    label: 'Netlify Usage & Billing',
    detail: 'Crèdits, deploys, bandwidth i requests.',
    href: 'https://app.netlify.com/billing',
  },
  {
    label: 'Netlify Project',
    detail: 'Projecte publicat quota.iessureda.com.',
    href: `https://app.netlify.com/projects/${netlifySiteName}`,
  },
];

const filesConteig = computed(() => conteigs.value.filter((fila) => fila.count > 0));
const totalDocuments = computed(() => conteigs.value.reduce((sum, fila) => sum + fila.count, 0));
const documentsCursActiu = computed(() =>
  conteigs.value
    .filter((fila) => fila.scope === 'active-course')
    .reduce((sum, fila) => sum + fila.count, 0)
);
const lecturesSessioAdmin = computed(() => Math.max(0, documentsCursActiu.value + countByKey('cursos') + countByKey('usuaris')));
const sessionsAdminDisponibles = computed(() => {
  if (!lecturesSessioAdmin.value) return null;
  return Math.floor(firebaseQuotas[0].limit / lecturesSessioAdmin.value);
});

const percentNetlify = computed(() => clampPercent((Number(netlifyCreditsUsed.value) || 0) / netlifyCreditsLimit));
const netlifyCreditsLeft = computed(() => Math.max(0, netlifyCreditsLimit - (Number(netlifyCreditsUsed.value) || 0)));
const estatNetlify = computed(() => estatPercent(percentNetlify.value));

const cardsResum = computed(() => [
  {
    label: 'Documents coneguts',
    value: formatNumber(totalDocuments.value),
    detail: 'col·leccions principals',
    class: 'border-t-sky-400',
  },
  {
    label: 'Lectures sessió admin',
    value: formatNumber(lecturesSessioAdmin.value),
    detail: sessionsAdminDisponibles.value === null ? 'pendent' : `~${sessionsAdminDisponibles.value} sessions/dia dins Spark`,
    class: riscSessionsAdmin.value === 'warning' ? 'border-t-amber-400' : 'border-t-emerald-400',
  },
  {
    label: 'Firebase lectures',
    value: `${percentQuota(firebaseQuotas[0])}%`,
    detail: `${formatNumber(restantQuota(firebaseQuotas[0]))} lectures restants`,
    class: classePercent(percentQuota(firebaseQuotas[0])),
  },
  {
    label: 'Netlify credits',
    value: `${percentNetlify.value}%`,
    detail: `${formatNumber(netlifyCreditsLeft.value)} crèdits restants`,
    class: classePercent(percentNetlify.value),
  },
]);

const riscSessionsAdmin = computed(() =>
  sessionsAdminDisponibles.value !== null && sessionsAdminDisponibles.value < 20 ? 'warning' : 'ok'
);

const avisos = computed(() => {
  const items = [];
  if (riscSessionsAdmin.value === 'warning') {
    items.push('Les sessions admin completes podrien acostar-se al límit de lectures si hi ha molta activitat en un mateix dia.');
  }
  for (const quota of firebaseQuotas) {
    if (percentQuota(quota) >= 80) items.push(`${quota.label}: supera el 80% del marge gratuït.`);
  }
  if (percentNetlify.value >= 80) items.push('Netlify: els crèdits mensuals estan per sobre del 80%.');
  if (!ultimaActualitzacio.value) items.push('Actualitza l’estimació per veure els documents actuals.');
  return items;
});

function countByKey(key) {
  return conteigs.value.find((fila) => fila.key === key)?.count || 0;
}

function collectionCount(pathSegments, label, scope = 'global') {
  return { pathSegments, label, scope, key: pathSegments.join(':') };
}

function objectiusConteig() {
  const rootCollections = ['cursos', 'usuaris', 'preautoritzats', 'presence', 'config'];
  const courseCollections = ['classes', 'professors', 'departaments', 'config', 'presence', 'sync_history'];
  const targets = rootCollections.map((name) => collectionCount([name], `/${name}`));
  const courseIds = new Set(cursStore.cursos.map((curs) => curs.id).filter(Boolean));
  if (cursStore.cursActiuId) courseIds.add(cursStore.cursActiuId);
  for (const cursId of courseIds) {
    for (const name of courseCollections) {
      targets.push(collectionCount(['cursos', cursId, name], `${cursId}/${name}`, cursId === cursStore.cursActiuId ? 'active-course' : 'course'));
    }
  }
  return targets;
}

async function actualitzarEstimacio() {
  carregant.value = true;
  error.value = '';
  try {
    if (!cursStore.cursosReady) cursStore.inicialitzar();
    const targets = objectiusConteig();
    const resultats = await Promise.all(targets.map(async (target) => {
      try {
        const snap = await getCountFromServer(collection(db, ...target.pathSegments));
        return { ...target, count: snap.data().count || 0, error: '' };
      } catch (e) {
        return { ...target, count: 0, error: e?.message || 'sense accés' };
      }
    }));
    conteigs.value = resultats;
    const fallades = resultats.filter((fila) => fila.error).length;
    error.value = fallades ? `${fallades} col·leccions no s'han pogut comptar per permisos o connexió.` : '';
    ultimaActualitzacio.value = new Date().toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    error.value = e?.message || "No s'ha pogut actualitzar l'estimació.";
  } finally {
    carregant.value = false;
  }
}

function percentQuota(quota) {
  return clampPercent((Number(consumManual[quota.id]) || 0) / quota.limit);
}

function restantQuota(quota) {
  return Math.max(0, quota.limit - (Number(consumManual[quota.id]) || 0));
}

function estatQuota(quota) {
  return estatPercent(percentQuota(quota));
}

function estatPercent(percent) {
  if (percent >= 90) return { label: 'Crític', class: 'bg-red-100 text-red-700', barClass: 'bg-red-500' };
  if (percent >= 75) return { label: 'Vigilar', class: 'bg-amber-100 text-amber-800', barClass: 'bg-amber-500' };
  return { label: 'Bé', class: 'bg-emerald-100 text-emerald-700', barClass: 'bg-emerald-500' };
}

function classePercent(percent) {
  if (percent >= 90) return 'border-t-red-400';
  if (percent >= 75) return 'border-t-amber-400';
  return 'border-t-emerald-400';
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
}

function formatNumber(value) {
  return new Intl.NumberFormat('ca-ES').format(Math.max(0, Math.round(Number(value) || 0)));
}

function guardarConsumManual() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    consumManual,
    netlifyCreditsUsed: Number(netlifyCreditsUsed.value) || 0,
  }));
}

function carregarConsumManual() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(consumManual, saved.consumManual || {});
    netlifyCreditsUsed.value = Number(saved.netlifyCreditsUsed) || 0;
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

onMounted(() => {
  carregarConsumManual();
  if (!cursStore.cursosReady) cursStore.inicialitzar();
  actualitzarEstimacio();
});
</script>
