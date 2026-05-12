<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
          Validació final
        </h2>
        <p class="mt-1 text-base text-slate-600 dark:text-slate-300">
          Revisió del repartiment abans de donar-lo per tancat.
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-sm">
        <span
          class="rounded-full px-3 py-1.5 font-semibold"
          :class="isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'"
        >
          {{ isConnected ? 'Dades en directe' : 'Desconnectat' }}
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          Actualitzat: {{ lastUpdate }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-xl border p-4 shadow-sm"
        :class="card.class"
      >
        <p class="text-sm font-semibold">{{ card.label }}</p>
        <p class="mt-2 text-3xl font-bold">{{ card.value }}</p>
        <p class="mt-1 text-sm opacity-80">{{ card.detail }}</p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">
            Estat general
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ resumEstat }}
          </p>
        </div>
        <div
          class="rounded-full px-4 py-2 text-sm font-bold"
          :class="estatFinal.class"
        >
          {{ estatFinal.text }}
        </div>
      </div>
    </div>

    <section
      v-for="bloc in blocsVisibles"
      :key="bloc.id"
      class="overflow-hidden rounded-xl border bg-white shadow-lg dark:bg-gray-800"
      :class="bloc.borderClass"
    >
      <button
        class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        :class="bloc.headerClass"
        @click="toggleBloc(bloc.id)"
      >
        <div>
          <h3 class="text-lg font-bold">{{ bloc.title }}</h3>
          <p class="mt-1 text-sm opacity-80">{{ bloc.description }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-full bg-white/70 px-3 py-1 text-sm font-bold dark:bg-gray-900/60">
            {{ bloc.items.length }}
          </span>
          <span class="text-lg">{{ blocsOberts[bloc.id] ? '−' : '+' }}</span>
        </div>
      </button>

      <div v-if="blocsOberts[bloc.id]" class="divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="item in bloc.items"
          :key="item.key"
          class="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]"
        >
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">
              {{ item.title }}
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ item.detail }}
            </p>
          </div>
          <div class="text-sm font-medium text-slate-500 dark:text-slate-400 lg:text-right">
            {{ item.context }}
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="senseIncidencies"
      class="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-900 shadow-lg dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
    >
      <p class="text-xl font-bold">Tot sembla a punt</p>
      <p class="mt-2 text-sm">
        No hi ha incidències crítiques ni avisos pendents amb les regles actuals.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted, reactive, ref } from 'vue';
import { onSnapshot, query } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { limitsHoresProfessor, textJornada, professorsClasse, classeAssignadaA, horesComputablesClasse } from '../utils/horesProfessor';

const cursStore = useCursStore();

const classes = ref([]);
const professors = ref([]);
const isConnected = ref(true);
const lastUpdate = ref(formatData(new Date()));
const blocsOberts = reactive({
  critiques: true,
  professorat: true,
  grups: true,
  organitzacio: true,
  dades: false,
});

let classesUnsubscribe = null;
let professorsUnsubscribe = null;

const TIPUS_NO_COMPTEN_GRUP = ['D', 'S', 'F', 'PALIC', 'GP', 'C'];
const TIPUS_CONEGUTS = ['', 'D', 'S', 'F', 'PALIC', 'GP', 'C'];

function formatData(data) {
  return data.toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalitzarTipus(tipus) {
  return (tipus || '').toString().trim().toUpperCase();
}

function normalitzarText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function esOptativa(tipus) {
  const normal = normalitzarTipus(tipus);
  return normal.startsWith('O') || normal.startsWith('T');
}

function esTutoria(classe) {
  return normalitzarText(classe.materia).replace(/^\*/, '').includes('tutoria');
}

function esTutoriaAsterisc(classe) {
  return (classe.materia || '').toString().trim().startsWith('*') && esTutoria(classe);
}

function esCapDepartament(classe) {
  const materia = normalitzarText(classe.materia);
  return materia.includes('cap') && materia.includes('departament');
}

function teAssignacio(classe) {
  const assignats = professorsClasse(classe).length;
  if (normalitzarTipus(classe.tipus).startsWith('T')) return assignats >= 2;
  return assignats > 0;
}

function clauFranjaOptativa(tipus) {
  const normal = normalitzarTipus(tipus);
  if (normal.startsWith('T')) return `O${normal.slice(1)}`;
  return normal || 'O';
}

function teGrup(classe) {
  return Boolean((classe.curs || '').toString().trim() && (classe.grup || '').toString().trim());
}

function teDepartament(classe) {
  return Boolean((classe.departament || '').toString().trim() || classe.departaments?.[0]);
}

function normalitzarGrup(grup) {
  const value = (grup || '').toString().trim();
  if (!value || value.includes('+') || value.length <= 1) return value;
  if (/^[A-Za-z]+$/.test(value)) return value.split('').join('+');
  return value;
}

function expandirGrups(classe) {
  const grup = normalitzarGrup(classe.grup);
  if (!grup) return [];
  return grup.split('+').map((g) => ({ ...classe, grup: g }));
}

function comptaPerGrup(classe) {
  const tipus = normalitzarTipus(classe.tipus);
  if (TIPUS_NO_COMPTEN_GRUP.includes(tipus)) return false;
  if ((classe.materia || '').startsWith('*')) return false;
  return teGrup(classe);
}

function calcularTotalHoresGrup(classesDelGrup, nomesAssignades = false) {
  const optativesVistes = new Set();
  const materiesMax = {};
  let total = 0;

  classesDelGrup.forEach((classe) => {
    const tipus = normalitzarTipus(classe.tipus);
    if (!comptaPerGrup(classe)) return;
    if (nomesAssignades && !teAssignacio(classe)) return;

    if (esOptativa(tipus)) {
      const clauOptativa = clauFranjaOptativa(tipus);
      if (!optativesVistes.has(clauOptativa)) {
        optativesVistes.add(clauOptativa);
        total += Number(classe.hores) || 0;
      }
    } else if (classe.materia) {
      materiesMax[classe.materia] = Math.max(
        materiesMax[classe.materia] || 0,
        Number(classe.hores) || 0
      );
    }
  });

  Object.values(materiesMax).forEach((hores) => {
    total += hores;
  });
  return total;
}

function detallClasse(classe) {
  return [
    classe.departament || classe.departaments?.[0],
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${classe.hores}h` : '',
    classe.tipus ? `Tipus ${classe.tipus}` : '',
  ].filter(Boolean).join(' · ');
}

function updateLastUpdate() {
  lastUpdate.value = formatData(new Date());
}

const classesExpandides = computed(() => classes.value.flatMap((classe) => expandirGrups(classe)));

const classesSenseAssignar = computed(() =>
  classes.value
    .filter((classe) => {
      const tipus = normalitzarTipus(classe.tipus);
      if (tipus === 'GP' && !teAssignacio(classe)) return false;
      if (tipus === 'PALIC' && !teAssignacio(classe)) return false;
      return Number(classe.hores) > 0 && !teAssignacio(classe);
    })
    .map((classe) => ({
      key: `sense-${classe.id}`,
      title: classe.materia || 'Matèria sense nom',
      detail: 'No té cap professor assignat.',
      context: detallClasse(classe),
    }))
);

const grupsIncomplets = computed(() => {
  const perGrup = new Map();
  classesExpandides.value.forEach((classe) => {
    if (!teGrup(classe)) return;
    const key = `${classe.curs}|${classe.grup}`;
    if (!perGrup.has(key)) perGrup.set(key, []);
    perGrup.get(key).push(classe);
  });

  return [...perGrup.entries()]
    .map(([key, llista]) => {
      const [curs, grup] = key.split('|');
      const total = calcularTotalHoresGrup(llista);
      const assignades = calcularTotalHoresGrup(llista, true);
      const pendents = llista.filter((classe) => comptaPerGrup(classe) && !teAssignacio(classe));
      return { curs, grup, total, assignades, pendents };
    })
    .filter((item) => item.total > 0 && item.pendents.length > 0)
    .map((item) => ({
      key: `grup-${item.curs}-${item.grup}`,
      title: `${item.curs} ${item.grup}`,
      detail: `${item.assignades}h assignades de ${item.total}h. Pendents: ${item.pendents.map((c) => c.materia).join(', ')}`,
      context: `${item.pendents.length} files sense professor`,
    }));
});

const incidenciesProfessorat = computed(() =>
  professors.value
    .map((professor) => {
      const horesLectives = classes.value
        .filter((classe) => classeAssignadaA(classe, professor.nom) && normalitzarTipus(classe.tipus) !== 'GP')
        .reduce((total, classe) => total + horesComputablesClasse(classe), 0);
      const gp = classes.value
        .filter((classe) => classeAssignadaA(classe, professor.nom) && normalitzarTipus(classe.tipus) === 'GP')
        .reduce((total, classe) => total + (Number(classe.hores) || 0), 0);
      const limits = limitsHoresProfessor(professor);
      let tipus = '';
      if (horesLectives < limits.ideal) tipus = 'baix';
      if (horesLectives > limits.maxim) tipus = 'alt';
      return { professor, horesLectives, gp, limits, tipus };
    })
    .filter((item) => item.tipus)
    .map((item) => ({
      key: `prof-${item.professor.id || item.professor.nom}`,
      title: item.professor.nom,
      detail:
        item.tipus === 'baix'
          ? `Té ${item.horesLectives}h lectives i l'objectiu de ${textJornada(item.professor)} és ${item.limits.ideal}h.`
          : `Té ${item.horesLectives}h lectives i el màxim de ${textJornada(item.professor)} és ${item.limits.maxim}h.`,
      context: item.gp ? `GP: ${item.gp}h` : item.professor.departament || '',
      tipus: item.tipus,
    }))
);

const coordinacionsSenseCoordinador = computed(() =>
  classes.value
    .filter((classe) => normalitzarTipus(classe.tipus) === 'C' && !teAssignacio(classe))
    .map((classe) => ({
      key: `coord-${classe.id}`,
      title: classe.materia || 'Coordinació sense nom',
      detail: 'La comissió o coordinació no té coordinador.',
      context: `${classe.hores || 0}h`,
    }))
);

const tutoriesSenseTutor = computed(() =>
  classes.value
    .filter((classe) => esTutoria(classe) && !esTutoriaAsterisc(classe) && !teAssignacio(classe))
    .map((classe) => ({
      key: `tut-${classe.id}`,
      title: classe.materia || 'Tutoria',
      detail: 'La tutoria del grup no té tutor assignat.',
      context: `${classe.curs || ''} ${classe.grup || ''}`.trim() || 'Sense grup',
    }))
);

const capsSenseAssignar = computed(() =>
  classes.value
    .filter((classe) => esCapDepartament(classe) && !teAssignacio(classe))
    .map((classe) => ({
      key: `cap-${classe.id}`,
      title: classe.departament || classe.departaments?.[0] || classe.materia,
      detail: 'El cap de departament no té professor assignat.',
      context: `${classe.hores || 0}h`,
    }))
);

const dadesProblematiques = computed(() =>
  classes.value
    .filter((classe) => {
      const tipus = normalitzarTipus(classe.tipus);
      if (!classe.materia || Number(classe.hores) <= 0 || !teDepartament(classe)) return true;
      if (tipus && !TIPUS_CONEGUTS.includes(tipus) && !esOptativa(tipus) && !/^A\d+$/.test(tipus)) return true;
      return false;
    })
    .map((classe) => ({
      key: `dada-${classe.id}`,
      title: classe.materia || 'Fila sense matèria',
      detail: motiuDadaProblematica(classe),
      context: detallClasse(classe),
    }))
);

const critiques = computed(() => [
  ...classesSenseAssignar.value,
  ...grupsIncomplets.value,
  ...coordinacionsSenseCoordinador.value,
  ...tutoriesSenseTutor.value,
  ...capsSenseAssignar.value,
]);

const avisosProfessorat = computed(() =>
  incidenciesProfessorat.value.filter((item) => item.tipus === 'baix')
);

const critiquesProfessorat = computed(() =>
  incidenciesProfessorat.value.filter((item) => item.tipus === 'alt')
);

const blocs = computed(() => [
  {
    id: 'critiques',
    title: 'Incidències crítiques',
    description: "S’haurien de resoldre abans de tancar el repartiment.",
    items: [...critiques.value, ...critiquesProfessorat.value],
    borderClass: 'border-red-200 dark:border-red-800',
    headerClass: 'bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200',
  },
  {
    id: 'professorat',
    title: 'Avisos de professorat',
    description: 'Professors per sota de les hores recomanades.',
    items: avisosProfessorat.value,
    borderClass: 'border-amber-200 dark:border-amber-800',
    headerClass: 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  },
  {
    id: 'dades',
    title: 'Dades a revisar',
    description: 'Files amb camps buits o tipus no classificats.',
    items: dadesProblematiques.value,
    borderClass: 'border-slate-200 dark:border-slate-700',
    headerClass: 'bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  },
]);

const blocsVisibles = computed(() => blocs.value.filter((bloc) => bloc.items.length > 0));

const senseIncidencies = computed(() =>
  blocs.value.every((bloc) => bloc.items.length === 0)
);

const cards = computed(() => [
  {
    label: 'Crítiques',
    value: critiques.value.length + critiquesProfessorat.value.length,
    detail: 'bloquegen el tancament',
    class: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200',
  },
  {
    label: 'Avisos',
    value: avisosProfessorat.value.length,
    detail: 'convé revisar',
    class: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  },
  {
    label: 'Classes',
    value: classes.value.length,
    detail: `${classesSenseAssignar.value.length} sense assignar`,
    class: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-white',
  },
  {
    label: 'Professors',
    value: professors.value.length,
    detail: `${incidenciesProfessorat.value.length} fora de rang`,
    class: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-white',
  },
]);

const estatFinal = computed(() => {
  if (critiques.value.length + critiquesProfessorat.value.length > 0) {
    return {
      text: 'No tancar encara',
      class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }
  if (avisosProfessorat.value.length || dadesProblematiques.value.length) {
    return {
      text: 'Revisable',
      class: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    };
  }
  return {
    text: 'A punt per tancar',
    class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  };
});

const resumEstat = computed(() => {
  const totalCritiques = critiques.value.length + critiquesProfessorat.value.length;
  if (totalCritiques > 0) return `${totalCritiques} incidències crítiques pendents.`;
  if (avisosProfessorat.value.length > 0) return `${avisosProfessorat.value.length} avisos de professorat pendents.`;
  if (dadesProblematiques.value.length > 0) return `${dadesProblematiques.value.length} files convindria revisar.`;
  return "No s'han detectat problemes amb les regles actuals.";
});

function motiuDadaProblematica(classe) {
  const tipus = normalitzarTipus(classe.tipus);
  if (!classe.materia) return 'Falta matèria.';
  if (Number(classe.hores) <= 0) return 'Hores buides o zero.';
  if (!teDepartament(classe)) return 'Falta departament.';
  if (tipus && !TIPUS_CONEGUTS.includes(tipus) && !esOptativa(tipus) && !/^A\d+$/.test(tipus)) {
    return `Tipus no classificat: ${classe.tipus}.`;
  }
  return 'Cal revisar la fila.';
}

function toggleBloc(id) {
  blocsOberts[id] = !blocsOberts[id];
}

function setupRealtimeListeners() {
  cleanupListeners();
  classesUnsubscribe = onSnapshot(
    query(cursStore.col('classes')),
    (snapshot) => {
      classes.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );

  professorsUnsubscribe = onSnapshot(
    query(cursStore.col('professors')),
    (snapshot) => {
      professors.value = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      updateLastUpdate();
      isConnected.value = true;
    },
    () => {
      isConnected.value = false;
    }
  );
}

function cleanupListeners() {
  classesUnsubscribe?.();
  professorsUnsubscribe?.();
  classesUnsubscribe = null;
  professorsUnsubscribe = null;
}

watch(() => cursStore.cursActiuId, setupRealtimeListeners, { immediate: true });
onUnmounted(cleanupListeners);
</script>
