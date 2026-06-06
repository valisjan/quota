<template>
  <div class="fulla-repartiment">
    <!-- Capçalera pantalla (oculta en impressió) -->
    <div class="print-hide mb-4 flex items-center justify-between">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ departament }} · {{ dataAvui }}
      </p>
      <div class="flex gap-2">
        <button
          @click="exportarExcel"
          class="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          &darr; Excel
        </button>
        <button
          @click="imprimir"
          class="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          Imprimir
        </button>
      </div>
    </div>

    <!-- Capçalera impressió -->
    <div class="print-only print-doc-header">
      <div class="print-school">IES Josep Sureda i Blanes · Distribució de la càrrega lectiva</div>
      <div class="print-title">Departament de {{ departament }}</div>
      <div class="print-meta">
        <span>Data: {{ dataAvui }}</span>
        <span>Hores lectives: {{ totalHoresAssignades }} / {{ totalHoresDepartament }}h</span>
        <span>Professors: {{ professors.length }}</span>
      </div>
    </div>

    <!-- Resum numèric (pantalla) -->
    <div class="print-hide mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
      <div>
        <span class="text-slate-600 dark:text-slate-400">Hores lectives:</span>
        <strong class="ml-1.5" :class="totalHoresAssignades === totalHoresDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'">
          {{ totalHoresAssignades }} / {{ totalHoresDepartament }}h
        </strong>
      </div>
      <div>
        <span class="text-slate-600 dark:text-slate-400">Professors:</span>
        <strong class="ml-1.5 text-slate-900 dark:text-white">{{ professors.length }}</strong>
        <span class="ml-1 text-slate-500 dark:text-slate-500">(~{{ professorsNecessaris }} necessaris)</span>
      </div>
      <div v-if="totalGpDepartament > 0">
        <span class="text-slate-600 dark:text-slate-400">GP:</span>
        <strong class="ml-1.5" :class="totalGpAssignades === totalGpDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'">
          {{ totalGpAssignades }} / {{ totalGpDepartament }}
        </strong>
      </div>
      <div v-if="totalPalicDepartament > 0">
        <span class="text-slate-600 dark:text-slate-400">PALIC:</span>
        <strong class="ml-1.5" :class="totalPalicAssignades === totalPalicDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'">
          {{ totalPalicAssignades }} / {{ totalPalicDepartament }}
        </strong>
      </div>
      <div>
        <span class="text-slate-600 dark:text-slate-400">Sense assignar:</span>
        <strong class="ml-1.5" :class="classesNoAssignades.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'">
          {{ classesNoAssignades.length }}
        </strong>
      </div>
    </div>

    <!-- Taula principal de professors -->
    <div class="print-table-wrapper overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-slate-100 dark:bg-gray-700">
            <th class="border-b border-r border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700 dark:border-gray-600 dark:text-gray-200">
              Professor/a
            </th>
            <th class="border-b border-r border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700 dark:border-gray-600 dark:text-gray-200">
              Matèries assignades
            </th>
            <th class="w-14 border-b border-r border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700 dark:border-gray-600 dark:text-gray-200">
              Lect.
            </th>
            <th
              v-if="totalGpDepartament > 0"
              class="w-12 border-b border-r border-slate-300 px-3 py-2.5 text-center font-semibold text-teal-700 dark:border-gray-600 dark:text-teal-300"
            >
              GP
            </th>
            <th
              v-if="totalPalicDepartament > 0"
              class="w-14 border-b border-r border-slate-300 px-3 py-2.5 text-center font-semibold text-orange-700 dark:border-gray-600 dark:text-orange-300"
            >
              PALIC
            </th>
            <th class="w-14 border-b border-r border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700 dark:border-gray-600 dark:text-gray-200">
              Total
            </th>
            <th class="w-28 border-b border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700 dark:border-gray-600 dark:text-gray-200">
              Estat
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(professor, i) in professors"
            :key="professor.id"
            class="border-l-[3px]"
            :class="[
              i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50/70 dark:bg-gray-800/60',
              rowAccentClass(professor),
            ]"
          >
            <!-- Nom -->
            <td class="border-b border-r border-slate-200 px-3 py-2 align-top dark:border-gray-700">
              <div class="font-medium text-slate-900 dark:text-white">{{ professor.nom }}</div>
              <div v-if="professor.preferencia" class="mt-0.5 text-xs"
                :class="professor.preferencia === 'pronto' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'"
              >
                {{ professor.preferencia === 'pronto' ? 'Entrar prest' : 'Entrar tard' }}
              </div>
              <div v-if="professor.comentaris" class="mt-0.5 text-xs italic text-slate-500 dark:text-gray-500">
                {{ professor.comentaris }}
              </div>
            </td>

            <!-- Matèries -->
            <td class="border-b border-r border-slate-200 px-3 py-2 align-top dark:border-gray-700">
              <div v-if="getClassesProfessor(professor.nom).length === 0" class="italic text-slate-500 dark:text-gray-500">
                Sense assignació
              </div>
              <div
                v-for="c in getClassesProfessor(professor.nom)"
                :key="c.id"
                class="flex items-baseline gap-1 leading-relaxed"
              >
                <span class="w-12 shrink-0 text-xs text-slate-500 dark:text-gray-500">
                  {{ c.curs }}{{ c.grup ? ' ' + c.grup : '' }}
                </span>
                <span class="text-slate-800 dark:text-gray-200">{{ c.materia }}</span>
                <span v-if="c.tipus" class="rounded bg-slate-100 px-1 text-[10px] text-slate-600 dark:bg-gray-700 dark:text-gray-400">
                  {{ c.tipus }}
                </span>
                <span
                  v-if="c.professorAssignat !== professor.nom"
                  class="rounded bg-indigo-100 px-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                >
                  codocent
                </span>
                <span class="ml-auto shrink-0 font-mono text-xs text-slate-600 dark:text-gray-400">
                  {{ c.hores }}h
                </span>
              </div>
            </td>

            <!-- Lectives -->
            <td class="border-b border-r border-slate-200 px-3 py-2.5 text-center align-middle font-mono dark:border-gray-700">
              <span class="text-slate-900 dark:text-white">{{ calcularHoresProfessor(professor.nom) }}</span>
            </td>

            <!-- GP -->
            <td
              v-if="totalGpDepartament > 0"
              class="border-b border-r border-slate-200 px-3 py-2.5 text-center align-middle font-mono dark:border-gray-700"
              :class="getHoresGp(professor.nom) > 0 ? 'text-teal-700 dark:text-teal-300' : 'text-slate-300 dark:text-gray-600'"
            >
              {{ getHoresGp(professor.nom) || '-' }}
            </td>

            <!-- PALIC -->
            <td
              v-if="totalPalicDepartament > 0"
              class="border-b border-r border-slate-200 px-3 py-2.5 text-center align-middle font-mono dark:border-gray-700"
              :class="getHoresPalic(professor.nom) > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-slate-300 dark:text-gray-600'"
            >
              {{ getHoresPalic(professor.nom) || '-' }}
            </td>

            <!-- Total -->
            <td
              class="border-b border-r border-slate-200 px-3 py-2.5 text-center align-middle font-bold font-mono dark:border-gray-700"
              :class="totalColorClass(professor)"
            >
              {{ totalComputable(professor.nom) }}
            </td>

            <!-- Estat -->
            <td class="border-b border-slate-200 px-3 py-2.5 text-center align-middle dark:border-gray-700">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="estatBadgeClass(professor)">
                {{ estatText(professor) }}
              </span>
            </td>
          </tr>

          <!-- Fila de totals -->
          <tr class="totals-row bg-slate-100 font-semibold dark:bg-gray-700">
            <td class="border-t-primary border-slate-300 px-3 py-2.5 text-slate-700 dark:border-gray-500 dark:text-gray-200">
              TOTAL
            </td>
            <td class="border-t-primary border-slate-300 px-3 py-2.5 dark:border-gray-500"></td>
            <td class="border-t-primary border-slate-300 px-3 py-2.5 text-center font-mono dark:border-gray-500">
              <span :class="totalHoresAssignades === totalHoresDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'">
                {{ totalHoresAssignades }}
              </span>
              <span class="text-xs font-normal text-slate-500"> / {{ totalHoresDepartament }}</span>
            </td>
            <td
              v-if="totalGpDepartament > 0"
              class="border-t-primary border-slate-300 px-3 py-2.5 text-center font-mono dark:border-gray-500"
              :class="totalGpAssignades === totalGpDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'"
            >
              {{ totalGpAssignades }} / {{ totalGpDepartament }}
            </td>
            <td
              v-if="totalPalicDepartament > 0"
              class="border-t-primary border-slate-300 px-3 py-2.5 text-center font-mono dark:border-gray-500"
              :class="totalPalicAssignades === totalPalicDepartament ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'"
            >
              {{ totalPalicAssignades }} / {{ totalPalicDepartament }}
            </td>
            <td class="border-t-primary border-slate-300 px-3 py-2.5 dark:border-gray-500" colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Classes sense assignar -->
    <div class="classes-sense-assignar mt-6">
      <div class="mb-2 flex items-center gap-2">
        <h3 class="font-semibold text-slate-700 dark:text-gray-200">Classes sense assignar</h3>
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-bold"
          :class="classesNoAssignades.length > 0
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
        >
          {{ classesNoAssignades.length }}
        </span>
      </div>

      <div
        v-if="classesNoAssignades.length === 0"
        class="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
      >
        Totes les classes estan assignades &#10003;
      </div>

      <div v-else class="overflow-x-auto rounded-lg border border-red-200 dark:border-red-900/50">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-red-50 dark:bg-red-900/20">
              <th class="border-b border-red-200 px-3 py-2 text-left font-semibold text-red-800 dark:border-red-900/40 dark:text-red-300">Curs</th>
              <th class="border-b border-red-200 px-3 py-2 text-left font-semibold text-red-800 dark:border-red-900/40 dark:text-red-300">Grup</th>
              <th class="border-b border-red-200 px-3 py-2 text-left font-semibold text-red-800 dark:border-red-900/40 dark:text-red-300">Matèria</th>
              <th class="border-b border-red-200 px-3 py-2 text-center font-semibold text-red-800 dark:border-red-900/40 dark:text-red-300">Tipus</th>
              <th class="border-b border-red-200 px-3 py-2 text-center font-semibold text-red-800 dark:border-red-900/40 dark:text-red-300">Hores</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, i) in classesNoAssignades"
              :key="c.id"
              :class="i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-red-50/40 dark:bg-red-900/10'"
            >
              <td class="border-b border-red-100 px-3 py-2 text-slate-700 dark:border-red-900/20 dark:text-gray-300">{{ c.curs }}</td>
              <td class="border-b border-red-100 px-3 py-2 text-slate-700 dark:border-red-900/20 dark:text-gray-300">{{ c.grup }}</td>
              <td class="border-b border-red-100 px-3 py-2 font-medium text-slate-900 dark:border-red-900/20 dark:text-white">{{ c.materia }}</td>
              <td class="border-b border-red-100 px-3 py-2 text-center dark:border-red-900/20">
                <span v-if="c.tipus" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-gray-700 dark:text-gray-400">
                  {{ c.tipus }}
                </span>
                <span v-else class="text-slate-300">-</span>
              </td>
              <td class="border-b border-red-100 px-3 py-2 text-center font-mono text-slate-700 dark:border-red-900/20 dark:text-gray-300">
                {{ c.hores }}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { limitsHoresProfessor } from '../../utils/horesProfessor';
import { descarregarExcel } from '../../utils/exportExcel';
import { classeCompletamentAssignada } from '../../utils/assignacions';
import { exclosaDelRepartiment } from '../../utils/tipus';

const props = defineProps({
  departament: { type: String, required: true },
  professors: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
  totalHoresAssignades: { type: Number, default: 0 },
  totalHoresDepartament: { type: Number, default: 0 },
  totalGpDepartament: { type: Number, default: 0 },
  totalGpAssignades: { type: Number, default: 0 },
  totalPalicDepartament: { type: Number, default: 0 },
  totalPalicAssignades: { type: Number, default: 0 },
  getClassesProfessor: { type: Function, required: true },
  calcularHoresProfessor: { type: Function, required: true },
  getHoresGp: { type: Function, required: true },
  getHoresPalic: { type: Function, required: true },
});

const dataAvui = new Date().toLocaleDateString('ca-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const classesNoAssignades = computed(() =>
  props.classes.filter(
    (c) =>
      !exclosaDelRepartiment(c.tipus) &&
      !classeCompletamentAssignada(c)
  )
);

const professorsNecessaris = computed(() => {
  const exact = props.totalHoresDepartament / 18;
  return (Math.round(exact * 10) / 10).toString();
});

function totalComputable(nom) {
  return props.calcularHoresProfessor(nom) + props.getHoresPalic(nom);
}

function limitsProf(professor) {
  return limitsHoresProfessor(professor);
}

function estatText(professor) {
  const h = totalComputable(professor.nom);
  const lim = limitsProf(professor);
  if (h === 0) return 'Sense hores';
  if (h === lim.ideal) return 'Complert';
  if (h > lim.maxim) return 'Excés';
  if (h > lim.ideal) return 'Sobre ideal';
  return `Pendent ${lim.ideal - h}h`;
}

function estatBadgeClass(professor) {
  const h = totalComputable(professor.nom);
  const lim = limitsProf(professor);
  if (h === lim.ideal) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (h > lim.maxim) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  if (h > lim.ideal) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-400';
}

function rowAccentClass(professor) {
  const h = totalComputable(professor.nom);
  const lim = limitsProf(professor);
  if (h > lim.maxim) return 'border-l-red-400 dark:border-l-red-600';
  if (h === lim.ideal) return 'border-l-emerald-400 dark:border-l-emerald-600';
  if (h > lim.ideal) return 'border-l-amber-400 dark:border-l-amber-600';
  return 'border-l-transparent';
}

function totalColorClass(professor) {
  const h = totalComputable(professor.nom);
  const lim = limitsProf(professor);
  if (h === lim.ideal) return 'text-emerald-700 dark:text-emerald-400';
  if (h > lim.maxim) return 'text-red-700 dark:text-red-400';
  if (h > lim.ideal) return 'text-amber-900 dark:text-amber-400';
  return 'text-slate-900 dark:text-white';
}

function imprimir() {
  window.print();
}

function exportarExcel() {
  const data = new Date().toLocaleDateString('ca-ES');
  const nomFitxer = `repartiment_${props.departament}_${new Date().toISOString().slice(0, 10)}`;

  // Full 1: Resum per professor
  const capRepartiment = ['Professor', 'H. Lectives', 'GP', 'PALIC', 'Total', 'Estat'];
  const filesRepartiment = props.professors.map((p) => [
    p.nom,
    props.calcularHoresProfessor(p.nom),
    props.getHoresGp(p.nom) || 0,
    props.getHoresPalic(p.nom) || 0,
    totalComputable(p.nom),
    estatText(p),
  ]);
  filesRepartiment.push(['TOTAL', props.totalHoresAssignades, props.totalGpAssignades, props.totalPalicAssignades, '', '']);

  const fullRepartiment = [
    [`Full de repartiment - ${props.departament}`, '', '', '', '', ''],
    [`Data: ${data}`, '', '', '', '', ''],
    [],
    capRepartiment,
    ...filesRepartiment,
  ];

  // Full 2: Detall d'assignacions
  const capAssig = ['Professor', 'Matèria', 'Curs', 'Grup', 'Tipus', 'Hores'];
  const filesAssig = [];
  for (const p of props.professors) {
    const classesProfessor = props.getClassesProfessor(p.nom);
    if (classesProfessor.length === 0) {
      filesAssig.push([p.nom, '(Sense assignació)', '', '', '', '']);
    } else {
      for (const c of classesProfessor) {
        filesAssig.push([p.nom, c.materia, c.curs || '', c.grup || '', c.tipus || '', c.hores]);
      }
    }
  }

  // Full 3: Classes sense assignar
  const capSense = ['Curs', 'Grup', 'Matèria', 'Tipus', 'Hores'];
  const filesSense = classesNoAssignades.value.length
    ? classesNoAssignades.value.map((c) => [c.curs || '', c.grup || '', c.materia, c.tipus || '', c.hores])
    : [['(Totes les classes estan assignades)', '', '', '', '']];

  descarregarExcel([
    { nom: 'Repartiment', dades: fullRepartiment },
    { nom: 'Assignacions', dades: [capAssig, ...filesAssig] },
    { nom: 'Sense assignar', dades: [capSense, ...filesSense] },
  ], nomFitxer);
}
</script>

<style>
@media print {
  body > * {
    visibility: hidden;
  }
  .fulla-repartiment,
  .fulla-repartiment * {
    visibility: visible;
  }
  .fulla-repartiment {
    position: absolute;
    inset: 0;
    padding: 1.5rem;
    font-size: 11px;
  }
  .print-hide {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
}

@media screen {
  .print-only {
    display: none;
  }
}
</style>
