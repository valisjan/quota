<template>
  <div>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-2">
        <p class="text-sm text-text-secondary">
          Proposta orientativa de distribució. No modifica les dades actuals.
        </p>
        <label class="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            v-model="partirActual"
            class="h-4 w-4 rounded border-slate-300 accent-primary"
          />
          Partir de la distribució actual (manté les classes ja assignades)
        </label>
        <p v-if="proposta" class="text-xs text-text-muted">
          Millor resultat de {{ iteracionsProvades }} combinacions ·
          {{ totalClassesFixadesActuals }} ja fixades · {{ classesPerDistribuir.length }} redistribuïdes
        </p>
        <p v-if="professorsExclosos > 0" class="text-xs text-amber-800">
          {{ professorsExclosos }} {{ professorsExclosos === 1 ? 'professor exclòs' : 'professors exclosos' }} per jornada reduïda - no apareixen a la proposta
        </p>
      </div>
      <button
        @click="generar"
        :disabled="!teProfessors || !teClasses || calculant"
        class="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-40"
      >
        {{ calculant ? 'Calculant...' : proposta ? 'Regenera' : 'Genera proposta' }}
      </button>
    </div>

    <!-- Empty / no data -->
    <div
      v-if="!teProfessors || !teClasses"
      class="app-empty-state py-10"
    >
      {{ !teProfessors ? 'No hi ha professors al departament' : 'No hi ha classes per distribuir' }}
    </div>

    <div v-else-if="calculant" class="app-card p-4 text-center text-sm font-medium text-text-main">
      <div>Calculant la millor proposta... {{ iteracionsProvades }} combinacions provades</div>
      <div class="app-progress-track mt-3 h-2 rounded-full">
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-150"
          :style="{ width: `${progresCalcul}%` }"
        />
      </div>
      <div class="mt-1 text-xs text-primary">{{ progresCalcul }}%</div>
    </div>

    <div v-else-if="!proposta" class="app-empty-state py-10">
      Encara no hi ha cap proposta generada.
    </div>

    <template v-else>
      <div v-if="errorProposta" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
        {{ errorProposta }}
      </div>

      <!-- Stats -->
      <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="card-stat-success text-center">
          <div class="text-xl font-bold text-green-700">{{ statsIdeal }}</div>
          <div class="text-xs text-text-secondary">En quota</div>
        </div>
        <div class="card-stat-danger text-center">
          <div class="text-xl font-bold text-amber-800">{{ statsOverIdeal }}</div>
          <div class="text-xs text-text-secondary">Per sobre</div>
        </div>
        <div class="card-stat-primary text-center">
          <div class="text-xl font-bold text-blue-600">{{ statsUnderIdeal }}</div>
          <div class="text-xs text-text-secondary">Per sota</div>
        </div>
        <div class="card-stat-primary text-center">
          <div
            class="text-xl font-bold"
            :class="totalHoresCobertes === totalHoresDepartament ? 'text-green-700' : 'text-rose-600'"
          >
            {{ totalHoresCobertes }}/{{ totalHoresDepartament }}h
          </div>
          <div class="text-xs text-text-secondary">Hores repartides</div>
          <div
            class="mt-1 text-[11px] font-semibold leading-snug"
            :class="totalHoresPerRepartir === 0 ? 'text-green-700' : 'text-rose-600'"
          >
            {{ totalHoresPerRepartir }}h per distribuir
          </div>
        </div>
      </div>

      <!-- Professor cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="slot in proposta"
          :key="slot.nom"
          class="app-card p-4"
          :class="badgeBorderClass(slot)"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <h4 class="text-sm font-semibold leading-tight text-text-main">{{ slot.nom }}</h4>
            <span
              class="shrink-0 rounded px-2 py-0.5 text-xs font-bold"
              :class="badgeClass(slot)"
            >{{ slot.hores }}h</span>
          </div>
          <p class="mb-3 text-xs text-text-muted">
            Ideal: {{ slot.ideal }}h · Màx: {{ slot.maxim }}h
            <span v-if="slot.horesFixades > 0" class="ml-1">({{ slot.horesFixades }}h fixes)</span>
          </p>

          <div v-if="slot.classesFixades.length || slot.classes.length" class="space-y-1">
            <!-- Fixed classes (coordination + already assigned) -->
            <div
              v-for="classe in sortClasses(slot.classesFixades)"
              :key="'fix-' + classe.id"
              class="flex items-baseline justify-between text-xs opacity-60"
            >
              <span class="mr-2 flex min-w-0 items-center gap-1.5 truncate italic text-text-secondary">
                <span class="min-w-0 truncate">{{ classe.materia }}</span>
                <span
                  v-if="classe.tipus"
                  class="shrink-0 not-italic"
                  :class="getTipusBadgeClass(classe.tipus, 'sm')"
                >
                  {{ getTipusLabel(classe.tipus) }}
                </span>
                <span v-if="classe.curs || classe.grup" class="text-text-muted">
                  {{ classe.curs }} {{ classe.grup }}
                </span>
              </span>
              <span class="shrink-0 font-medium text-text-muted">{{ classe.hores }}h</span>
            </div>

            <!-- Divider -->
            <div
              v-if="slot.classesFixades.length && slot.classes.length"
              class="my-1.5 border-t border-dashed border-border-soft"
            />

            <!-- Newly assigned classes -->
            <div
              v-for="classe in sortClasses(slot.classes)"
              :key="classe.id"
              class="flex items-baseline justify-between text-xs"
            >
              <span class="mr-2 flex min-w-0 items-center gap-1.5 truncate text-text-secondary">
                <span class="min-w-0 truncate">{{ classe.materia }}</span>
                <span
                  v-if="classe.tipus"
                  class="shrink-0"
                  :class="getTipusBadgeClass(classe.tipus, 'sm')"
                >
                  {{ getTipusLabel(classe.tipus) }}
                </span>
                <span v-if="classe.curs || classe.grup" class="text-text-muted">
                  {{ classe.curs }} {{ classe.grup }}
                </span>
              </span>
              <span class="shrink-0 font-medium text-text-secondary">{{ classe.hores }}h</span>
            </div>
          </div>
          <p v-else class="text-xs italic text-text-muted">Sense classes assignades</p>
        </div>
      </div>

      <div v-if="classesDesbordades.length" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
        <h5 class="mb-2 text-sm font-semibold text-rose-800">
          Classes que no caben sense superar les 21 hores
        </h5>
        <p class="mb-2 text-xs text-rose-700">
          Queden {{ totalHoresDesbordades }}h repartibles sense col·locar.
        </p>
        <div class="space-y-1">
          <div v-for="c in classesDesbordades" :key="c.id" class="text-xs text-rose-700">
            {{ c.materia }} {{ c.curs }} {{ c.grup }} - {{ c.hores }}h
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { limitsHoresProfessor, professorsClasse, esMajorDe55Classe } from '../../utils/horesProfessor';
import {
  esTutoriaPrincipal,
  teTutoriaPrincipalParellada,
  trobarTutoriaAsterisc,
  trobarAssignaturesParelladesTutoria,
  esDedicacioPrefacturaClasse,
} from '../../utils/tutories';
import { esGP, esPALIC, esOptativaCompartida, getTipusBadgeClass, getTipusLabel } from '../../utils/tipus';
import { trobarGermanesBloc } from '../../utils/grups';

const props = defineProps({
  professors: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
});

const TEMPS_MAX_GENERACIO_MS = 15000;
const MAX_ITERACIONS = 500000;

const proposta = ref(null);
const classesDesbordades = ref([]);
const errorProposta = ref('');
const partirActual = ref(true);
const iteracionsProvades = ref(0);
const calculant = ref(false);
const progresCalcul = ref(0);

// All professors of a class, including participants[] for C-type
function professorsDeClasse(classe) {
  const tipusC = (classe.tipus || '').toString().toUpperCase().trim() === 'C';
  const fromProfessors = professorsClasse(classe);
  if (tipusC) {
    const fromParticipants = Array.isArray(classe.participants)
      ? classe.participants.filter(Boolean)
      : [];
    return [...new Set([...fromProfessors, ...fromParticipants])];
  }
  return fromProfessors;
}

// Assignable classes: all except GP, PALIC, *Majors de 55, and *Dedicació a prefactura (fixed)
const assignables = computed(() =>
  props.classes.filter(
    (c) =>
      !esGP(c.tipus) &&
      !esPALIC(c.tipus) &&
      !esMajorDe55Classe(c) &&
      !esDedicacioPrefacturaClasse(c) &&
      !teTutoriaPrincipalParellada(c, props.classes)
  )
);

// Majors de 55 classes: always fixed, count toward the assigned teacher's hours
const classesMajors55 = computed(() =>
  props.classes.filter((c) => esMajorDe55Classe(c))
);

// *Dedicació a prefactura classes: always fixed (paired with cap d'estudis)
const classesDedicacioPrefactura = computed(() =>
  props.classes.filter((c) => esDedicacioPrefacturaClasse(c))
);

// Already-assigned classes (only relevant when partirActual = true)
const classesJaAssignades = computed(() =>
  partirActual.value
    ? assignables.value.filter((c) => classeCompletamentAssignada(c))
    : []
);

// Classes to distribute randomly
const classesPerDistribuir = computed(() =>
  partirActual.value
    ? assignables.value.filter((c) => !classeCompletamentAssignada(c))
    : assignables.value
);

const totalClassesFixadesActuals = computed(
  () => classesUnicesPerPaquets(classesJaAssignades.value).length
);

const professorsElegibles = computed(() =>
  props.professors.filter((p) => {
    const lim = limitsHoresProfessor(p);
    return lim.ideal >= 18 && lim.maxim <= 21;
  })
);

const professorsExclosos = computed(() =>
  props.professors.length - professorsElegibles.value.length
);

const teProfessors = computed(() => professorsElegibles.value.length > 0);
const teClasses = computed(() => assignables.value.length > 0);

// Total distributable hours (non-GP, non-PALIC)
const totalHoresDisponibles = computed(() =>
  classesUnicesPerPaquets(assignables.value).reduce((sum, c) => sum + (Number(c.hores) || 0), 0)
);

const totalHoresDepartament = computed(() =>
  props.classes
    .filter((c) => !esGP(c.tipus) && !esPALIC(c.tipus))
    .reduce((sum, c) => sum + (Number(c.hores) || 0), 0)
);

const totalHoresNoDistribuibles = computed(() =>
  Math.max(0, totalHoresDepartament.value - totalHoresDisponibles.value)
);

const totalHoresFixadesActuals = computed(() =>
  classesUnicesPerPaquets(classesJaAssignades.value)
    .reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
);

const totalHoresFixadesSenseTargeta = computed(() =>
  classesUnicesPerPaquets(
    classesJaAssignades.value.filter(
      (classe) => professorsDeClasse(classe).filter(professorEsElegible).length === 0
    )
  ).reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
);

const totalHoresDistribuides = computed(() =>
  classesUnicesProposta.value.reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
);

const totalHoresRepartiblesCobertes = computed(() =>
  totalHoresDistribuides.value + totalHoresFixadesSenseTargeta.value
);

const totalHoresCobertes = computed(() =>
  totalHoresRepartiblesCobertes.value + totalHoresNoDistribuibles.value
);

const totalHoresDesbordades = computed(() =>
  classesDesbordades.value.reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
);

const totalHoresPerRepartir = computed(() =>
  Math.max(0, totalHoresDepartament.value - totalHoresCobertes.value)
);

const classesUnicesProposta = computed(() => {
  const resultat = [];
  const vistes = new Set();
  for (const slot of proposta.value || []) {
    for (const classe of [...slot.classesFixades, ...slot.classes]) {
      if (!classeEsAssignable(classe) || vistes.has(classe.id)) continue;
      vistes.add(classe.id);
      resultat.push(classe);
    }
  }
  return resultat;
});

const statsIdeal = computed(() =>
  (proposta.value || []).filter((s) => s.hores === s.ideal).length
);
const statsOverIdeal = computed(() =>
  (proposta.value || []).filter((s) => s.hores > s.ideal).length
);
const statsUnderIdeal = computed(() =>
  (proposta.value || []).filter((s) => s.hores < s.ideal).length
);

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    if ((a.curs || '') !== (b.curs || '')) return (a.curs || '').localeCompare(b.curs || '');
    if (a.materia !== b.materia) return a.materia.localeCompare(b.materia);
    return (a.grup || '').localeCompare(b.grup || '');
  });
}


function badgeClass(slot) {
  if (slot.hores > slot.maxim) return 'bg-rose-100 text-rose-800';
  if (slot.hores > slot.ideal) return 'bg-amber-100 text-amber-800';
  if (slot.hores === slot.ideal) return 'bg-green-100 text-green-800';
  return 'bg-blue-100 text-blue-700';
}

function badgeBorderClass(slot) {
  if (slot.hores > slot.maxim) return 'border-rose-300';
  if (slot.hores > slot.ideal) return 'border-amber-200';
  if (slot.hores === slot.ideal) return 'border-green-200';
  return 'border-slate-200';
}

function afegirClasseUnica(llista, classe) {
  if (!classe || llista.some((item) => item.id === classe.id)) return;
  llista.push(classe);
}

function paquetClasses(classe) {
  const paquet = [];
  afegirClasseUnica(paquet, classe);
  // *Tutoria always travels with its principal tutoria (1:1 mandatory pair)
  if (esTutoriaPrincipal(classe)) {
    afegirClasseUnica(paquet, trobarTutoriaAsterisc(classe, props.classes));
  }
  return paquet;
}

function horesPaquetClasse(classe) {
  return paquetClasses(classe).reduce((sum, item) => sum + (Number(item.hores) || 0), 0);
}

function idsPaquet(classe) {
  return paquetClasses(classe).map((item) => item.id);
}

function classeEsAssignable(classe) {
  return (
    !esGP(classe.tipus) &&
    !esPALIC(classe.tipus) &&
    !esMajorDe55Classe(classe) &&
    !esDedicacioPrefacturaClasse(classe) &&
    !teTutoriaPrincipalParellada(classe, props.classes)
  );
}

function classeCompletamentAssignada(classe) {
  const assignats = professorsDeClasse(classe).length;
  if (esOptativaCompartida(classe.tipus)) return assignats >= 2;
  return assignats > 0;
}

function professorEsElegible(nomProfessor) {
  const professor = props.professors.find((p) => p.nom === nomProfessor);
  if (!professor) return false;
  const lim = limitsHoresProfessor(professor);
  return lim.ideal >= 18 && lim.maxim <= 21;
}

function horesComputablesPerProfessor(classe, totalProfessorsAssignats) {
  const hores = Number(classe.hores) || 0;
  if (esOptativaCompartida(classe.tipus) && totalProfessorsAssignats > 1) {
    return hores / totalProfessorsAssignats;
  }
  return hores;
}

function classesUnicesPerPaquets(classes) {
  const resultat = [];
  const vistes = new Set();
  for (const classe of classes) {
    const paquet = paquetClasses(classe);
    if (paquet.some((item) => vistes.has(item.id))) continue;
    paquet.forEach((item) => {
      vistes.add(item.id);
      resultat.push(item);
    });
  }
  return resultat;
}

function resumSlots(slots) {
  return slots.map((slot) => `${slot.nom} (${slot.hores}h)`).join(', ');
}

function crearSlotsBase(profLimits, fixatMap) {
  return profLimits.map((p) => {
    const fixat = fixatMap.get(p.nom);
    return {
      nom: p.nom,
      ideal: p.ideal,
      maxim: p.maxim,
      hores: fixat.hores,
      horesFixades: fixat.hores,
      horesFixadesCoord: fixat.horesCoord,
      horesFixadesEspecials: fixat.horesEspecials,
      classesFixades: fixat.classesFixades,
      classes: [],
    };
  });
}

function copiarSlots(slots) {
  return slots.map((slot) => ({
    ...slot,
    classesFixades: [...slot.classesFixades],
    classes: [...slot.classes],
  }));
}

function ordenarPaquetsPerIntent(classes) {
  const paquets = classesUnicesPerPaquets(classes);
  return [...paquets].sort((a, b) => {
    const ha = horesPaquetClasse(a);
    const hb = horesPaquetClasse(b);
    if (Math.random() < 0.82 && ha !== hb) return hb - ha;
    return Math.random() - 0.5;
  });
}

function ordenarCandidats(slots) {
  return [...slots].sort((a, b) => {
    const aDeficit = Math.max(a.ideal - a.hores, 0);
    const bDeficit = Math.max(b.ideal - b.hores, 0);
    if (aDeficit !== bDeficit) return bDeficit - aDeficit;
    if (a.hores !== b.hores) return a.hores - b.hores;
    return Math.random() - 0.5;
  });
}

function afegirPaquetASlot(slot, classe) {
  const paquet = paquetClasses(classe);
  const h = horesPaquetClasse(classe);
  slot.hores += h;
  slot.classes.push(...paquet);
}

function llevarPaquetDeSlot(slot, classe) {
  const ids = new Set(idsPaquet(classe));
  const h = horesPaquetClasse(classe);
  slot.classes = slot.classes.filter((item) => !ids.has(item.id));
  slot.hores -= h;
}

function paquetsMovibles(slot) {
  return classesUnicesPerPaquets(slot.classes).sort(
    (a, b) => horesPaquetClasse(b) - horesPaquetClasse(a)
  );
}

function intentarReubicarPerEncabir(slots, classe) {
  const h = horesPaquetClasse(classe);
  for (const target of ordenarCandidats(slots)) {
    if (target.hores + h <= target.maxim) {
      afegirPaquetASlot(target, classe);
      return true;
    }

    const horesAFerLloc = h - (target.maxim - target.hores);
    const movibles = paquetsMovibles(target).filter(
      (movible) => horesPaquetClasse(movible) >= horesAFerLloc
    );

    for (const movible of movibles) {
      const hm = horesPaquetClasse(movible);
      for (const receptor of ordenarCandidats(slots)) {
        if (receptor === target) continue;
        if (receptor.hores + hm > receptor.maxim) continue;
        llevarPaquetDeSlot(target, movible);
        afegirPaquetASlot(receptor, movible);
        afegirPaquetASlot(target, classe);
        return true;
      }
    }
  }
  return false;
}

function scoreProposta(slots, classesNoAssignades) {
  const horesNoAssignades = classesNoAssignades.reduce(
    (sum, classe) => sum + (Number(classe.hores) || 0),
    0
  );
  return slots.reduce((sum, slot) => {
    const underIdeal = Math.max(slot.ideal - slot.hores, 0);
    const overIdeal = Math.max(slot.hores - slot.ideal, 0);
    const overMax = Math.max(slot.hores - slot.maxim, 0);
    return sum + underIdeal * underIdeal * 7 + overIdeal * overIdeal + overMax * overMax * 100000;
  }, horesNoAssignades * 100000);
}

function esperarPintat() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function generar() {
  if (!teProfessors.value || !teClasses.value) return;
  calculant.value = true;
  errorProposta.value = '';
  classesDesbordades.value = [];
  iteracionsProvades.value = 0;
  progresCalcul.value = 0;
  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
  const profLimits = professorsElegibles.value.map((p) => ({
    nom: p.nom,
    ideal: limitsHoresProfessor(p).ideal,
    maxim: limitsHoresProfessor(p).maxim,
  }));

  // Build fixed hours map: fixed special classes + already-assigned classes (when partirActual)
  // horesEspecials tracks non-assignable fixed hours (coord + majors55 + dedicació)
  const fixatMap = new Map(
    profLimits.map((p) => [p.nom, { hores: 0, horesCoord: 0, horesEspecials: 0, classesFixades: [] }])
  );

  // 1b. Majors de 55 classes - always fixed, count toward assigned teacher's hours
  for (const classe of classesMajors55.value) {
    const profs = professorsDeClasse(classe);
    const h = Number(classe.hores) || 0;
    for (const nom of profs) {
      if (!fixatMap.has(nom)) continue;
      const entry = fixatMap.get(nom);
      entry.hores += h;
      entry.horesEspecials += h;
      entry.classesFixades.push(classe);
    }
  }

  // 1c. *Dedicació a prefactura - always fixed, paired with cap d'estudis
  for (const classe of classesDedicacioPrefactura.value) {
    const profs = professorsDeClasse(classe);
    const h = Number(classe.hores) || 0;
    for (const nom of profs) {
      if (!fixatMap.has(nom)) continue;
      const entry = fixatMap.get(nom);
      entry.hores += h;
      entry.horesEspecials += h;
      entry.classesFixades.push(classe);
    }
  }

  // 2. Already-assigned classes (only when partirActual)
  const classesFixadesIds = new Set();
  for (const classe of classesJaAssignades.value) {
    if (classesFixadesIds.has(classe.id)) continue;
    const profs = professorsDeClasse(classe);
    const eligibleProfs = profs.filter((nom) => fixatMap.has(nom));
    const paquet = paquetClasses(classe);
    paquet.forEach((item) => classesFixadesIds.add(item.id));
    // If all assigned professors are excluded (e.g. part-time), keep the class fixed
    // outside the generated professor cards.
    if (eligibleProfs.length === 0) continue;
    const h = paquet.reduce(
      (sum, item) => sum + horesComputablesPerProfessor(item, eligibleProfs.length),
      0
    );
    for (const nom of eligibleProfs) {
      const entry = fixatMap.get(nom);
      entry.hores += h;
      entry.classesFixades.push(...paquet);
    }
  }

  const perDistribuir = classesUnicesPerPaquets(classesPerDistribuir.value);
  const inici = performance.now();
  let millor = null;
  let millorScore = Infinity;
  let millorNoAssignades = [];

  for (let iter = 0; iter < MAX_ITERACIONS; iter++) {
    const elapsed = performance.now() - inici;
    if (elapsed >= TEMPS_MAX_GENERACIO_MS) break;
    if (iter > 0 && iter % 150 === 0) {
      iteracionsProvades.value = iter;
      progresCalcul.value = Math.min(99, Math.floor((elapsed / TEMPS_MAX_GENERACIO_MS) * 100));
      await esperarPintat();
    }
    const shuffled = ordenarPaquetsPerIntent(perDistribuir);
    const classesTractades = new Set(classesFixadesIds);
    const classesNoAssignades = [];

    const slots = crearSlotsBase(profLimits, fixatMap);

    for (const classe of shuffled) {
      if (classesTractades.has(classe.id)) continue;
      const paquet = paquetClasses(classe);
      if (paquet.some((item) => classesTractades.has(item.id))) continue;
      paquet.forEach((item) => classesTractades.add(item.id));

      let assignat = false;
      for (const slot of ordenarCandidats(slots)) {
        if (slot.hores + horesPaquetClasse(classe) <= slot.maxim) {
          afegirPaquetASlot(slot, classe);
          assignat = true;
          break;
        }
      }

      if (!assignat) {
        assignat = intentarReubicarPerEncabir(slots, classe);
      }

      if (!assignat) {
        classesNoAssignades.push(...paquet);
      }
    }

    const score = scoreProposta(slots, classesNoAssignades);

    if (score < millorScore) {
      millorScore = score;
      millor = copiarSlots(slots);
      millorNoAssignades = [...classesNoAssignades];
      if (millorNoAssignades.length === 0 && score === 0) {
        iteracionsProvades.value = iter + 1;
        break;
      }
    }
    iteracionsProvades.value = iter + 1;
  }
  progresCalcul.value = 100;

  // Soft constraint: move each group's subjects to the tutoria professor's slot if there's room.
  // Checks both pre-assigned (classesFixades) and randomly distributed (classes) tutorias.
  if (millor) {
    const processedTutorias = new Set();
    for (const slot of millor) {
      for (const classe of [...slot.classesFixades, ...slot.classes]) {
        if (!esTutoriaPrincipal(classe)) continue;
        if (processedTutorias.has(classe.id)) continue;
        processedTutorias.add(classe.id);
        for (const assignatura of trobarAssignaturesParelladesTutoria(classe, props.classes)) {
          if (slot.classesFixades.some((c) => c.id === assignatura.id)) continue;
          if (slot.classes.some((c) => c.id === assignatura.id)) continue;
          for (const otherSlot of millor) {
            const idx = otherSlot.classes.findIndex((c) => c.id === assignatura.id);
            if (idx !== -1) {
              const h = Number(assignatura.hores) || 0;
              if (slot.hores + h > slot.maxim) continue;
              otherSlot.classes.splice(idx, 1);
              otherSlot.hores -= h;
              slot.classes.push(assignatura);
              slot.hores += h;
              break;
            }
          }
        }
      }
    }
  }

  // Safety net: ensure bloc siblings end up together after random distribution.
  // Seeds from both fixed (pre-assigned) and randomly distributed classes.
  if (millor) {
    const processed = new Set();
    for (const slot of millor) {
      for (const classe of [...slot.classesFixades, ...slot.classes]) {
        if (processed.has(classe.id)) continue;
        const germanes = trobarGermanesBloc(classe, props.classes);
        if (germanes.length === 0) continue;
        processed.add(classe.id);
        for (const germana of germanes) {
          processed.add(germana.id);
          if (slot.classes.some((c) => c.id === germana.id)) continue;
          if (slot.classesFixades.some((c) => c.id === germana.id)) continue;
          for (const otherSlot of millor) {
            const idx = otherSlot.classes.findIndex((c) => c.id === germana.id);
            if (idx !== -1) {
              const h = Number(germana.hores) || 0;
              if (slot.hores + h > slot.maxim) continue;
              otherSlot.classes.splice(idx, 1);
              otherSlot.hores -= h;
              slot.classes.push(germana);
              slot.hores += h;
              break;
            }
          }
        }
      }
    }
  }

  proposta.value = millor ? millor.sort((a, b) => a.nom.localeCompare(b.nom)) : [];

  classesDesbordades.value = millorNoAssignades;

  const professorsSotaMinim = proposta.value.filter((slot) => slot.hores < slot.ideal);
  const professorsSobreMaxim = proposta.value.filter((slot) => slot.hores > slot.maxim);
  const avisos = [];

  if (professorsSotaMinim.length) {
    avisos.push(`Queden per sota de l'ideal: ${resumSlots(professorsSotaMinim)}.`);
  }

  if (professorsSobreMaxim.length) {
    avisos.push(`Ja superen el màxim per hores fixes: ${resumSlots(professorsSobreMaxim)}.`);
  }

  if (millorNoAssignades.length) {
    avisos.push(`${millorNoAssignades.length} classes no caben sense superar les 21 hores.`);
  }

    errorProposta.value = avisos.join(' ');
  } finally {
    calculant.value = false;
  }
}
</script>
