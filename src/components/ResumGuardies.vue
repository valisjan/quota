<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <div class="metric-card border-t-slate-300">
        <p class="metric-label">Total professors</p>
        <p class="metric-value">{{ stats.total }}</p>
      </div>
      <div class="metric-card border-t-sky-400">
        <p class="metric-label">GP assignades</p>
        <p class="metric-value">{{ stats.totalGP }}</p>
      </div>
      <div class="metric-card border-t-violet-400">
        <p class="metric-label">GC assignades</p>
        <p class="metric-value">{{ stats.totalGC }}</p>
      </div>
      <div class="metric-card border-t-amber-400">
        <p class="metric-label">Passadís pendents</p>
        <p class="metric-value">{{ stats.ambPendents }}</p>
        <p class="metric-detail">{{ stats.totalPassadisPendents }} guàrdies</p>
      </div>
      <div class="metric-card border-t-danger">
        <p class="metric-label">De sobra</p>
        <p class="metric-value">{{ stats.ambSobra }}</p>
      </div>
      <div class="metric-card border-t-slate-300">
        <p class="metric-label">Exempts</p>
        <p class="metric-value">{{ stats.exempts }}</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-950">Llistat GP</h3>
              <p class="mt-1 text-sm text-slate-600">Professorat amb guàrdies de pati assignades.</p>
            </div>
            <span class="rounded-md bg-sky-100 px-2.5 py-1 text-sm font-bold text-sky-800">
              {{ stats.totalGP }}
            </span>
          </div>
        </div>

        <div v-if="!assignacionsGP.length" class="p-6 text-center text-sm text-slate-500">
          Encara no hi ha GP assignades.
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div v-for="grup in gpPerDepartament" :key="grup.departament" class="p-4">
            <div class="mb-2 flex items-center justify-between gap-3">
              <h4 class="text-sm font-bold text-slate-800">{{ grup.departament }}</h4>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {{ grup.total }} {{ etiquetaGuardies(grup.total) }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="item in grup.professors"
                :key="`gp-${item.nom}`"
                class="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-slate-100"
              >
                <span class="min-w-0 truncate text-sm font-medium text-slate-900">{{ item.nom }}</span>
                <span class="shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-sm font-bold text-sky-800">
                  {{ item.quantitat }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-950">Llistat GC</h3>
              <p class="mt-1 text-sm text-slate-600">Professorat amb guàrdies de convivència assignades.</p>
            </div>
            <span class="rounded-md bg-violet-100 px-2.5 py-1 text-sm font-bold text-violet-800">
              {{ stats.totalGC }}
            </span>
          </div>
        </div>

        <div v-if="!assignacionsGC.length" class="p-6 text-center text-sm text-slate-500">
          Encara no hi ha GC assignades.
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div v-for="grup in gcPerDepartament" :key="grup.departament" class="p-4">
            <div class="mb-2 flex items-center justify-between gap-3">
              <h4 class="text-sm font-bold text-slate-800">{{ grup.departament }}</h4>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {{ grup.total }} {{ etiquetaGuardies(grup.total) }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="item in grup.professors"
                :key="`gc-${item.nom}`"
                class="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-slate-100"
              >
                <span class="min-w-0 truncate text-sm font-medium text-slate-900">{{ item.nom }}</span>
                <span class="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-sm font-bold text-violet-800">
                  {{ item.quantitat }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="card overflow-hidden">
      <div class="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex gap-1">
            <button
              v-for="f in filtres"
              :key="f.id"
              type="button"
              @click="filtre = f.id"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition"
              :class="filtre === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'"
            >{{ f.nom }}</button>
          </div>
          <span class="text-sm text-slate-500">{{ professorsFiltrats.length }} professors</span>
        </div>
      </div>

      <div v-if="carregant" class="p-10 text-center text-sm text-slate-500">Carregant...</div>

      <div v-else-if="!professorsFiltrats.length" class="p-8 text-center text-sm text-slate-500">
        Cap professor amb aquest filtre.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Professor</th>
              <th class="px-3 py-3 text-left">Departament</th>
              <th class="px-3 py-3 text-center" title="Guàrdies esperades (base menys participació en comissió)">Esperades</th>
              <th class="px-3 py-3 text-center">GP</th>
              <th class="px-3 py-3 text-center">GC</th>
              <th class="px-3 py-3 text-center">Passadís</th>
              <th class="px-4 py-3 text-right">Estat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="p in professorsFiltrats"
              :key="p.nom"
              class="hover:bg-slate-50"
              :class="p.detall.estat === 'exempt' ? 'opacity-50' : ''"
            >
              <td class="px-4 py-2.5 font-medium text-slate-900">
                {{ p.nom }}
                <span v-if="p.detall.tutor" class="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-700">T</span>
                <span v-if="p.detall.comissio" class="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">C</span>
              </td>
              <td class="px-3 py-2.5 text-slate-500">{{ p.departament }}</td>
              <td class="px-3 py-2.5 text-center font-semibold text-slate-700">
                {{ p.detall.estat === 'exempt' ? '—' : p.detall.expected }}
              </td>
              <td class="px-3 py-2.5 text-center" :class="p.detall.gp > 0 ? 'font-semibold text-slate-900' : 'text-slate-300'">
                {{ p.detall.gp || '·' }}
              </td>
              <td class="px-3 py-2.5 text-center" :class="p.detall.gc > 0 ? 'font-semibold text-slate-900' : 'text-slate-300'">
                {{ p.detall.gc || '·' }}
              </td>
              <td class="px-3 py-2.5 text-center" :class="p.detall.passadis > 0 ? 'font-semibold text-amber-700' : 'text-slate-300'">
                {{ p.detall.estat === 'exempt' ? '—' : (p.detall.passadis || '·') }}
              </td>
              <td class="px-4 py-2.5 text-right">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="estatClass(p.detall.estat)">
                  {{ estatText(p.detall) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-xs text-slate-400 px-1">
      T = Tutor (base 2) · C = Membre de comissió (−1 màxim; coordinar la pròpia comissió no descompta) · GP = Guàrdia de pati · GC = Guàrdia de convivència · Passadís = guàrdies de passadís pendents
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { detallGuardes } from '../utils/guardes';

const filtre = ref('tots');

const filtres = [
  { id: 'tots', nom: 'Tots' },
  { id: 'incidencia', nom: 'Amb incidència' },
  { id: 'pendent', nom: 'Passadís pendents' },
  { id: 'sobra', nom: 'De sobra' },
  { id: 'exempt', nom: 'Exempts' },
];

const { items: professors, loading: carregant } = useCursCollectionSnapshot({ colName: 'professors' });
const { items: classes } = useCursCollectionSnapshot({ colName: 'classes' });

const professorsAmbDetall = computed(() =>
  [...professors.value]
    .filter((p) => !p.eliminatDelFull)
    .sort((a, b) =>
      (a.departament || '').localeCompare(b.departament || '', 'ca') ||
      (a.nom || '').localeCompare(b.nom || '', 'ca')
    )
    .map((p) => ({ ...p, detall: detallGuardes(p, classes.value) }))
);

const stats = computed(() => {
  const llista = professorsAmbDetall.value;
  return {
    total: llista.length,
    totalGP: llista.reduce((s, p) => s + p.detall.gp, 0),
    totalGC: llista.reduce((s, p) => s + p.detall.gc, 0),
    ambPendents: llista.filter((p) => p.detall.estat === 'pendent').length,
    totalPassadisPendents: llista.reduce((s, p) => s + p.detall.passadis, 0),
    ambSobra: llista.filter((p) => p.detall.estat === 'sobra').length,
    exempts: llista.filter((p) => p.detall.estat === 'exempt').length,
  };
});

const assignacionsGP = computed(() => assignacionsPerTipus('gp'));
const assignacionsGC = computed(() => assignacionsPerTipus('gc'));
const gpPerDepartament = computed(() => agruparPerDepartament(assignacionsGP.value));
const gcPerDepartament = computed(() => agruparPerDepartament(assignacionsGC.value));

const professorsFiltrats = computed(() => {
  const llista = professorsAmbDetall.value;
  if (filtre.value === 'pendent') return llista.filter((p) => p.detall.estat === 'pendent');
  if (filtre.value === 'sobra') return llista.filter((p) => p.detall.estat === 'sobra');
  if (filtre.value === 'exempt') return llista.filter((p) => p.detall.estat === 'exempt');
  if (filtre.value === 'incidencia') return llista.filter((p) => p.detall.estat === 'sobra' || p.detall.estat === 'pendent');
  return llista;
});

function estatText(detall) {
  if (detall.estat === 'exempt') return 'Exempt';
  if (detall.estat === 'sobra') return `${detall.sobra} de sobra`;
  if (detall.estat === 'pendent') return `${detall.passadis} pendent${detall.passadis !== 1 ? 's' : ''}`;
  return 'OK';
}

function estatClass(estat) {
  if (estat === 'exempt') return 'bg-slate-100 text-slate-400';
  if (estat === 'sobra') return 'bg-red-100 text-red-700';
  if (estat === 'pendent') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

function assignacionsPerTipus(tipus) {
  return professorsAmbDetall.value
    .filter((p) => p.detall[tipus] > 0)
    .map((p) => ({
      nom: p.nom,
      departament: p.departament || 'Sense departament',
      quantitat: p.detall[tipus],
    }));
}

function agruparPerDepartament(assignacions) {
  const grups = new Map();
  assignacions.forEach((item) => {
    const departament = item.departament || 'Sense departament';
    if (!grups.has(departament)) {
      grups.set(departament, { departament, total: 0, professors: [] });
    }
    const grup = grups.get(departament);
    grup.total += item.quantitat;
    grup.professors.push(item);
  });

  return [...grups.values()]
    .map((grup) => ({
      ...grup,
      professors: grup.professors.sort((a, b) => a.nom.localeCompare(b.nom, 'ca')),
    }))
    .sort((a, b) => a.departament.localeCompare(b.departament, 'ca'));
}

function etiquetaGuardies(total) {
  return total === 1 ? 'guàrdia' : 'guàrdies';
}
</script>
