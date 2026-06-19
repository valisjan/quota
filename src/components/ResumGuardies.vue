<template>
  <div class="space-y-4">
    <!-- Resum global -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="metric-card border-t-slate-300">
        <p class="metric-label">Total professors</p>
        <p class="metric-value">{{ stats.total }}</p>
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

    <!-- Filtre -->
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
              <th class="px-3 py-3 text-center" title="Guàrdies esperades (base menys comissió)">Esperades</th>
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
      T = Tutor (base 2) · C = Participant de comissió (−1) · GP = Guàrdia de pati · GC = Guàrdia de convivència · Passadís = guàrdies de passadís pendents
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
    ambPendents: llista.filter((p) => p.detall.estat === 'pendent').length,
    totalPassadisPendents: llista.reduce((s, p) => s + p.detall.passadis, 0),
    ambSobra: llista.filter((p) => p.detall.estat === 'sobra').length,
    exempts: llista.filter((p) => p.detall.estat === 'exempt').length,
  };
});

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
</script>
