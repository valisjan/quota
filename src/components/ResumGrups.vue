<template>
  <div class="space-y-8">
    <!-- Connection indicator -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
          :class="
            isConnected
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
          "
        >
          <div
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          {{ isConnected ? 'Sincronització activa' : 'Desconnectat' }}
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Última actualització: {{ lastUpdate }}
        </div>
        <button
          @click="imprimirGrups"
          class="btn-primary flex items-center gap-2"
        >
          🖨️ Imprimir Resum de Grups
        </button>
      </div>
    </div>

    <!-- Filtres per nivell -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="filtre in filtres"
        :key="filtre.id"
        @click="filtreActiu = filtreActiu === filtre.id ? null : filtre.id"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
          filtreActiu === filtre.id
            ? 'bg-primary text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
      >
        {{ filtre.nom }}
      </button>
    </div>

    <div
      v-for="(classesPorGrup, curs) in classesAgrupadesPerCursFiltrades"
      :key="curs"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
      >
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ curs }}
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div
          v-for="(classes, grup) in classesPorGrup"
          :key="grup"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div
            class="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center"
          >
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-gray-900 dark:text-white">
                Grup {{ grup }}
              </h4>
              <span v-if="grupTeBordeRojo(classes)" class="text-red-500 text-sm"
                >⚠️</span
              >
            </div>
            <div class="text-sm font-medium" :class="getHoresClass(classes)">
              {{ calcularHoresAssignades(classes) }}h /
              {{ calcularTotalHoresGrup(classes) }}h
              <span v-if="totsAssignats(classes)">✅</span>
              <span v-else>⚠️</span>
            </div>
          </div>

          <div class="p-4 space-y-3">
            <template
              v-for="item in agruparClassesPerVista(classes)"
              :key="item.key"
            >
              <!-- Bloc d'optatives agrupades -->
              <div
                v-if="item.esGrupOptatives"
                class="p-3 rounded-lg border"
                :class="
                  item.classes.some((c) => !c.professorAssignat)
                    ? 'border-red-500 border-2 bg-red-50 dark:bg-red-900/20'
                    : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                "
              >
                <div class="flex justify-between items-center mb-2">
                  <span class="badge badge-green">
                    🔵 Optativa {{ item.tipus !== 'O' ? item.tipus : '' }} —
                    {{ item.hores }}h
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400"
                    >mateixa franja</span
                  >
                </div>
                <div class="space-y-1">
                  <div
                    v-for="classe in item.classes"
                    :key="classe.id"
                    class="flex justify-between items-center text-sm px-2 py-1 rounded"
                    :class="
                      !classe.professorAssignat
                        ? 'bg-red-50 dark:bg-red-900/30'
                        : 'bg-white dark:bg-gray-800'
                    "
                  >
                    <span
                      class="text-gray-800 dark:text-gray-200 font-medium"
                      >{{ classe.materia }}</span
                    >
                    <span
                      v-if="classe.professorAssignat"
                      class="text-gray-500 dark:text-gray-400 text-xs"
                    >
                      {{ classe.professorAssignat }}
                    </span>
                    <span v-else class="text-red-500 text-xs"
                      >⚠️ Sense prof.</span
                    >
                  </div>
                </div>
              </div>

              <!-- Matèria amb múltiples professors (normal + D/S/F) -->
              <div
                v-else-if="item.esGrupMateria"
                class="p-3 rounded-lg border"
                :class="item.classes.some(c => !c.professorAssignat)
                  ? 'border-orange-400 border-2 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'"
              >
                <div class="flex justify-between items-center mb-2">
                  <strong class="text-gray-900 dark:text-white">{{ item.materia }}</strong>
                  <span class="font-bold text-gray-900 dark:text-white">{{ item.hores }}h</span>
                </div>
                <div class="space-y-1">
                  <div
                    v-for="classe in item.classes"
                    :key="classe.id"
                    class="flex justify-between items-center text-sm px-2 py-1 rounded"
                    :class="!classe.professorAssignat ? 'bg-red-50 dark:bg-red-900/30' : 'bg-white dark:bg-gray-800'"
                  >
                    <div class="flex items-center gap-2">
                      <span v-if="classe.tipus" :class="getTipusBadgeClass(classe.tipus)" class="inline-flex items-center gap-1">
                        {{ getTipusIcon(classe.tipus) }} {{ getTipusText(classe.tipus) }}
                      </span>
                      <span v-else class="text-xs text-gray-500 dark:text-gray-400">Normal</span>
                      <span v-if="classe.hores !== item.hores" class="text-xs text-gray-400 dark:text-gray-500">({{ classe.hores }}h)</span>
                    </div>
                    <span v-if="classe.professorAssignat" class="text-gray-500 dark:text-gray-400 text-xs">{{ classe.professorAssignat }}</span>
                    <span v-else class="text-red-500 text-xs">⚠️ Sense prof.</span>
                  </div>
                </div>
              </div>

              <!-- Classe normal -->
              <div
                v-else
                class="p-3 rounded-lg border"
                :class="getClasseStyle(item.classe)"
              >
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <strong class="text-gray-900 dark:text-white">{{
                      item.classe.materia
                    }}</strong>
                    <span
                      v-if="item.classe.tipus"
                      :class="getTipusBadgeClass(item.classe.tipus)"
                      class="inline-flex items-center gap-1"
                    >
                      {{ getTipusIcon(item.classe.tipus) }}
                      {{ getTipusText(item.classe.tipus) }}
                    </span>
                    <span
                      v-if="!comptaPerGrup(item.classe)"
                      class="text-xs text-gray-400"
                      >(no compta grup)</span
                    >
                    <span
                      v-if="!item.classe.professorAssignat"
                      class="text-red-500 text-sm"
                      >⚠️</span
                    >
                  </div>
                  <span class="text-gray-700 dark:text-gray-300 ml-2 shrink-0"
                    >{{ item.classe.hores }}h</span
                  >
                </div>
                <div
                  v-if="item.classe.professorAssignat"
                  class="text-sm text-gray-700 dark:text-gray-300"
                >
                  Prof: {{ item.classe.professorAssignat }}
                </div>
                <div
                  v-else
                  class="text-sm text-red-600 dark:text-red-400 font-medium"
                >
                  ⚠️ Sense professor assignat
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Coordination activities -->
    <div
      v-if="coordinationActivities.length > 0"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
      >
        <div class="flex items-center gap-2">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Activitats de Coordinació
          </h3>
          <span
            v-if="coordinationActivitiesSenseAssignar.length > 0"
            class="text-red-500 text-sm"
          >
            ⚠️ {{ coordinationActivitiesSenseAssignar.length }} sense assignar
          </span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Tutories, caps de departament, PALIC i altres activitats sense grup
          específic
        </p>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="activity in sortCoordinationActivities(
              coordinationActivities
            )"
            :key="activity.id"
            class="p-4 rounded-lg border"
            :class="
              !activity.professorAssignat
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 border-2'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            "
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <strong class="text-gray-900 dark:text-white">{{
                  activity.materia
                }}</strong>
                <span
                  v-if="activity.tipus"
                  :class="getTipusBadgeClass(activity.tipus)"
                  class="inline-flex items-center gap-1"
                >
                  {{ getTipusIcon(activity.tipus) }}
                  {{ getTipusText(activity.tipus) }}
                </span>
              </div>
              <span class="text-gray-700 dark:text-gray-300 font-medium"
                >{{ activity.hores }}h</span
              >
            </div>
            <div
              v-if="activity.professorAssignat"
              class="text-sm text-gray-700 dark:text-gray-300"
            >
              Prof: {{ activity.professorAssignat }}
            </div>
            <div
              v-else
              class="text-sm text-red-600 dark:text-red-400 font-medium"
            >
              ⚠️ Sense professor assignat
            </div>
            <div
              v-if="activity.departaments?.[0]"
              class="text-xs text-gray-600 dark:text-gray-400 mt-1"
            >
              Dept: {{ activity.departaments[0] }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden print content -->
    <div id="print-grups-content" class="hidden">
      <div class="print-page">
        <div class="print-header">
          <h1>Resum de Grups i Assignacions</h1>
          <p>Data: {{ new Date().toLocaleDateString('ca-ES') }}</p>
        </div>
        <div
          v-for="(classesPorGrup, curs) in classesAgrupadesPerCurs"
          :key="curs"
          class="print-curs"
        >
          <div class="curs-header">
            <h2>{{ curs }}</h2>
          </div>
          <div class="grups-grid">
            <div
              v-for="(classes, grup) in classesPorGrup"
              :key="grup"
              class="print-grup"
            >
              <div class="grup-header">
                <h3>Grup {{ grup }}</h3>
                <span
                  class="total-hours"
                  :class="{ 'hours-warning': !totsAssignats(classes) }"
                >
                  {{ calcularHoresAssignades(classes) }}h /
                  {{ calcularTotalHoresGrup(classes) }}h
                </span>
              </div>
              <div class="classes-list">
                <template
                  v-for="item in agruparClassesPerVista(classes)"
                  :key="item.key"
                >
                  <div
                    v-if="item.esGrupOptatives"
                    class="class-item optativa-group"
                  >
                    <span class="class-name"
                      >Optativa {{ item.tipus !== 'O' ? item.tipus : '' }} ({{
                        item.hores
                      }}h)</span
                    >
                    <div
                      v-for="c in item.classes"
                      :key="c.id"
                      style="padding-left: 12px; font-size: 12px"
                    >
                      {{ c.materia }} —
                      {{ c.professorAssignat || 'Sense assignar' }}
                    </div>
                  </div>
                  <div
                    v-else-if="item.esGrupMateria"
                    class="class-item optativa-group"
                    style="background: #f0f4ff; border-color: #90a4d4"
                  >
                    <span class="class-name"
                      >{{ item.materia }} ({{ item.hores }}h)</span
                    >
                    <div
                      v-for="c in item.classes"
                      :key="c.id"
                      style="padding-left: 12px; font-size: 12px"
                    >
                      {{ c.tipus || 'Normal' }}
                      <span v-if="c.hores !== item.hores">({{ c.hores }}h)</span>
                      — {{ c.professorAssignat || 'Sense assignar' }}
                    </div>
                  </div>
                  <div
                    v-else
                    class="class-item"
                    :class="{
                      'class-unassigned': !item.classe.professorAssignat,
                    }"
                  >
                    <span class="class-name">{{ item.classe.materia }}</span>
                    <span
                      class="class-professor"
                      :class="{ unassigned: !item.classe.professorAssignat }"
                    >
                      {{ item.classe.professorAssignat || 'Sense assignar' }}
                    </span>
                    <span class="class-hours">{{ item.classe.hores }}h</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';

const cursStore = useCursStore();
const classes = ref([]);
const isConnected = ref(true);
const lastUpdate = ref(new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
const filtreActiu = ref(null);
let classesUnsubscribe = null;

const filtres = [
  { id: '1r',   nom: '1r ESO' },
  { id: '2n',   nom: '2n ESO' },
  { id: '3r',   nom: '3r ESO' },
  { id: '4t',   nom: '4t ESO' },
  { id: 'batx', nom: 'Batxillerat' },
  { id: 'fp',   nom: 'FP' },
];

function getCursCategoria(curs) {
  const c = (curs || '').toUpperCase().trim();
  if (c.startsWith('1ESO') || c.startsWith('1R')) return '1r';
  if (c.startsWith('2ESO') || c.startsWith('2N')) return '2n';
  if (c.startsWith('3ESO') || c.startsWith('3R')) return '3r';
  if (c.startsWith('4ESO') || c.startsWith('4T')) return '4t';
  if (c.startsWith('1BAT') || c.startsWith('2BAT') || c.includes('BAT')) return 'batx';
  return 'fp';
}

const TIPUS_NO_COMPTEN_GRUP = ['D', 'F', 'PALIC', 'GP', 'C'];

function updateLastUpdate() {
  lastUpdate.value = new Date().toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function esOptativa(tipus) {
  const t = (tipus || '').toUpperCase().trim();
  return t.startsWith('O') || t.startsWith('T');
}

function clauFranjaOptativa(tipus) {
  const t = (tipus || '').toUpperCase().trim();
  if (t.startsWith('T')) return `O${t.slice(1)}`;
  return t || 'O';
}

function professorsClasse(classe) {
  if (Array.isArray(classe.professors) && classe.professors.length > 0) {
    return classe.professors.filter(Boolean);
  }
  return [classe.professorAssignat].filter(Boolean);
}

function classeAssignada(classe) {
  const tipus = (classe.tipus || '').toUpperCase().trim();
  const assignats = professorsClasse(classe).length;
  if (tipus.startsWith('T')) return assignats >= 2;
  return assignats > 0;
}

function esAutodesdoble(tipus) {
  return /^A\d+$/.test((tipus || '').toUpperCase().trim());
}

function getAutodesdobleN(tipus) {
  const match = (tipus || '').toUpperCase().trim().match(/^A(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

function comptaPerGrup(classe) {
  const tipus = (classe.tipus || '').toUpperCase().trim();
  if (TIPUS_NO_COMPTEN_GRUP.includes(tipus)) return false;
  if (classe.materia?.startsWith('*')) return false;
  return true;
}

// Total d'hores del grup: per cada matèria només comptem les hores màximes
// (la classe principal té més hores que D/S que fan una part)
function calcularTotalHoresGrup(classesDelGrup) {
  const optativesVistes = new Set();
  const materiesMax = {};
  let total = 0;
  for (const classe of classesDelGrup) {
    const tipus = (classe.tipus || '').toUpperCase().trim();
    if (!comptaPerGrup(classe)) continue;
    if (esOptativa(tipus)) {
      const clauOptativa = clauFranjaOptativa(tipus);
      if (!optativesVistes.has(clauOptativa)) {
        optativesVistes.add(clauOptativa);
        total += classe.hores;
      }
    } else if (classe.materia) {
      if (materiesMax[classe.materia] === undefined || classe.hores > materiesMax[classe.materia]) {
        materiesMax[classe.materia] = classe.hores;
      }
    }
  }
  Object.values(materiesMax).forEach(h => { total += h; });
  return total;
}

// Hores ja assignades a professor (mateix criteri de màxim per matèria)
function calcularHoresAssignades(classesDelGrup) {
  const optativesVistes = new Set();
  const materiesMax = {};
  let total = 0;
  for (const classe of classesDelGrup) {
    const tipus = (classe.tipus || '').toUpperCase().trim();
    if (!comptaPerGrup(classe)) continue;
    if (!classeAssignada(classe)) continue;
    if (esOptativa(tipus)) {
      const clauOptativa = clauFranjaOptativa(tipus);
      if (!optativesVistes.has(clauOptativa)) {
        optativesVistes.add(clauOptativa);
        total += classe.hores;
      }
    } else if (classe.materia) {
      if (materiesMax[classe.materia] === undefined || classe.hores > materiesMax[classe.materia]) {
        materiesMax[classe.materia] = classe.hores;
      }
    }
  }
  Object.values(materiesMax).forEach(h => { total += h; });
  return total;
}

function totsAssignats(classesDelGrup) {
  return classesDelGrup.every((c) => classeAssignada(c));
}

function getHoresClass(classesDelGrup) {
  if (totsAssignats(classesDelGrup))
    return 'text-green-600 dark:text-green-400';
  const assignades = calcularHoresAssignades(classesDelGrup);
  const total = calcularTotalHoresGrup(classesDelGrup);
  if (assignades === 0) return 'text-red-600 dark:text-red-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

function agruparClassesPerVista(classesDelGrup) {
  const resultat = [];
  const tipusOptativesVists = new Set();
  const materiesVistes = new Set();

  const classesOrdenades = [...classesDelGrup].sort((a, b) => {
    const aOpt = esOptativa((a.tipus || '').toUpperCase().trim());
    const bOpt = esOptativa((b.tipus || '').toUpperCase().trim());
    if (aOpt !== bOpt) return aOpt ? 1 : -1;
    if (aOpt && bOpt) {
      const ta = (a.tipus || '').toUpperCase().trim();
      const tb = (b.tipus || '').toUpperCase().trim();
      return ta.localeCompare(tb);
    }
    return (a.materia || '').localeCompare(b.materia || '');
  });

  classesOrdenades.forEach((classe) => {
    const tipus = (classe.tipus || '').toUpperCase().trim();
    if (esOptativa(tipus)) {
      const clauOptativa = clauFranjaOptativa(tipus);
      if (!tipusOptativesVists.has(clauOptativa)) {
        tipusOptativesVists.add(clauOptativa);
        const classesDelTipus = classesDelGrup.filter(
          (c) => clauFranjaOptativa((c.tipus || '').toUpperCase().trim()) === clauOptativa
        );
        resultat.push({
          key: `optativa-${clauOptativa}`,
          esGrupOptatives: true,
          esGrupMateria: false,
          tipus: clauOptativa,
          hores: classe.hores,
          classes: classesDelTipus,
        });
      }
    } else if (classe.materia && !materiesVistes.has(classe.materia)) {
      materiesVistes.add(classe.materia);
      const classesDeMateria = classesDelGrup.filter(
        (c) => c.materia === classe.materia && !esOptativa((c.tipus || '').toUpperCase().trim())
      );
      if (classesDeMateria.length > 1) {
        const horesPerGrup = classesDeMateria.filter(c => comptaPerGrup(c)).map(c => c.hores);
        const horesMax = horesPerGrup.length > 0
          ? Math.max(...horesPerGrup)
          : Math.max(...classesDeMateria.map(c => c.hores));
        const classesOrdenadesMat = [...classesDeMateria].sort((a, b) => {
          const aCompta = comptaPerGrup(a) ? 0 : 1;
          const bCompta = comptaPerGrup(b) ? 0 : 1;
          return aCompta - bCompta;
        });
        resultat.push({
          key: `materia-${classe.materia}`,
          esGrupOptatives: false,
          esGrupMateria: true,
          materia: classe.materia,
          hores: horesMax,
          classes: classesOrdenadesMat,
        });
      } else {
        resultat.push({ key: classe.id, esGrupOptatives: false, esGrupMateria: false, classe });
      }
    }
  });

  return resultat;
}

function getClasseStyle(classe) {
  if (!classeAssignada(classe))
    return 'bg-red-50 dark:bg-red-900/20 border-red-500 border-2';
  if (!comptaPerGrup(classe))
    return 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-70';
  return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
}

function getTipusIcon(tipus) {
  const t = (tipus || '').toUpperCase().trim();
  if (t.startsWith('O') || t.startsWith('T')) return '🔵';
  if (esAutodesdoble(t)) return '🔄';
  const m = { D: '📊', S: '🤝', A: '🔄', F: '⚡', GP: '👮', PALIC: '🎯', C: '📋' };
  return m[t] || '📚';
}

function getTipusText(tipus) {
  const t = (tipus || '').toUpperCase().trim();
  if (t.startsWith('T')) return `Optativa compartida (${tipus})`;
  if (t.startsWith('O') && t.length > 1) return `Optativa (${tipus})`;
  if (esAutodesdoble(t)) return `Autodesdoble (${t})`;
  const m = {
    O: 'Optativa',
    D: 'Desdoblament',
    S: 'Suport',
    A: 'Autodesdoble',
    F: 'Flexible',
    GP: 'Guàrdies de Pati',
    PALIC: 'PALIC',
    C: 'Coordinació',
  };
  return m[t] || tipus;
}

function getTipusBadgeClass(tipus) {
  const t = (tipus || '').toUpperCase().trim();
  if (t.startsWith('O') || t.startsWith('T')) return 'badge badge-green';
  if (esAutodesdoble(t)) return 'badge badge-purple';
  const m = {
    D: 'badge badge-blue',
    S: 'badge badge-yellow',
    A: 'badge badge-purple',
    F: 'badge badge-indigo',
    GP: 'badge badge-red',
    PALIC: 'badge badge-orange',
    C: 'badge badge-purple',
  };
  return m[t] || 'badge badge-gray';
}

function grupTeBordeRojo(classes) {
  return classes.some((c) => !classeAssignada(c));
}

function sortCoordinationActivities(activities) {
  return [...activities].sort((a, b) => {
    if (a.departaments?.[0] !== b.departaments?.[0]) {
      return (a.departaments?.[0] || '').localeCompare(
        b.departaments?.[0] || ''
      );
    }
    return a.materia.localeCompare(b.materia);
  });
}

const coordinationActivities = computed(() => {
  return classes.value.filter(
    (c) =>
      (c.tipus || '').toString().toUpperCase().trim() !== 'C' &&
      (!c.curs || c.curs === '') &&
      (!c.grup || c.grup === '') &&
      c.materia &&
      c.materia !== ''
  );
});

const coordinationActivitiesSenseAssignar = computed(() => {
  return coordinationActivities.value.filter(
    (a) => !a.professorAssignat || a.professorAssignat.trim() === ''
  );
});

const classesAgrupadesPerCurs = computed(() => {
  const agrupades = {};
  classes.value.forEach((classe) => {
    if (!classe.curs || !classe.grup) return;
    const grups = classe.grup.split('+').map(g => g.trim()).filter(Boolean);
    const numGrups = grups.length;
    const tipusNorm = (classe.tipus || '').toUpperCase().trim();
    const esOpt = esOptativa(tipusNorm);
    const horesBase = (numGrups > 1 && !esOpt) ? Math.round(classe.hores / numGrups) : classe.hores;
    const horesPerGrup = esAutodesdoble(tipusNorm) ? Math.max(0, horesBase - getAutodesdobleN(tipusNorm)) : horesBase;
    grups.forEach((grupNet) => {
      if (!agrupades[classe.curs]) agrupades[classe.curs] = {};
      if (!agrupades[classe.curs][grupNet])
        agrupades[classe.curs][grupNet] = [];
      agrupades[classe.curs][grupNet].push({ ...classe, grup: grupNet, hores: horesPerGrup });
    });
  });
  return Object.keys(agrupades)
    .sort()
    .reduce((acc, curs) => {
      acc[curs] = Object.keys(agrupades[curs])
        .sort()
        .reduce((ga, grup) => {
          ga[grup] = agrupades[curs][grup];
          return ga;
        }, {});
      return acc;
    }, {});
});

const classesAgrupadesPerCursFiltrades = computed(() => {
  if (!filtreActiu.value) return classesAgrupadesPerCurs.value;
  return Object.fromEntries(
    Object.entries(classesAgrupadesPerCurs.value).filter(
      ([curs]) => getCursCategoria(curs) === filtreActiu.value
    )
  );
});

function setupRealtimeListeners() {
  cleanupListeners();
  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snapshot) => {
      classes.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );
}

function cleanupListeners() {
  if (classesUnsubscribe) {
    classesUnsubscribe();
    classesUnsubscribe = null;
  }
}

function imprimirGrups() {
  const printWindow = window.open('', '_blank');
  const printContent = document.getElementById('print-grups-content').innerHTML;
  const printHTML = `<!DOCTYPE html><html><head><title>Resum de Grups</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; padding: 20px; }
.print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
.print-curs { margin-bottom: 30px; }
.curs-header h2 { background: #f0f0f0; padding: 10px; border-radius: 5px; }
.grups-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.print-grup { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; page-break-inside: avoid; }
.grup-header { display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-bottom: 1px solid #ddd; }
.grup-header h3 { margin: 0; }
.total-hours { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #e8f5e8; color: #2e7d32; }
.hours-warning { background: #ffebee; color: #d32f2f; }
.classes-list { padding: 10px; }
.class-item { display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 8px; padding: 5px 0; border-bottom: 1px solid #eee; }
.class-item:last-child { border-bottom: none; }
.class-unassigned { background: #ffebee; border: 1px solid #d32f2f; border-radius: 4px; padding: 5px; }
.optativa-group { background: #e8f5e8; border: 1px solid #a5d6a7; border-radius: 4px; padding: 8px; margin: 4px 0; }
.unassigned { color: #d32f2f; font-weight: bold; }
@media print { .grups-grid { grid-template-columns: repeat(2, 1fr); } }
</style></head><body>${printContent}</body></html>`;
  printWindow.document.write(printHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(() => cleanupListeners());
</script>
