<template>
  <div>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-2">
        <p class="text-sm text-slate-600">
          Proposta de distribució calculada automàticament. No modifica les dades actuals.
        </p>
        <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            v-model="partirActual"
            class="h-4 w-4 rounded border-slate-300 accent-[#0024B6]"
          />
          Partir del repartiment actual (manté les classes ja assignades)
        </label>
        <p v-if="proposta" class="text-xs text-slate-400">
          Millor resultat de {{ NUM_ITERACIONS }} combinacions ·
          {{ totalClassesFixades }} fixes · {{ classesPerDistribuir.length }} redistribuïdes
        </p>
        <p v-if="professorsExclosos > 0" class="text-xs text-amber-600">
          {{ professorsExclosos }} {{ professorsExclosos === 1 ? 'professor exclòs' : 'professors exclosos' }} per jornada reduïda - no apareixen a la proposta
        </p>
      </div>
      <button
        @click="generar"
        :disabled="!teProfessors || !teClasses"
        class="shrink-0 rounded-md bg-[#0024B6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#001A8A] disabled:opacity-40"
      >
        {{ proposta ? 'Regenera' : 'Genera proposta' }}
      </button>
    </div>

    <!-- Empty / no data -->
    <div
      v-if="!teProfessors || !teClasses"
      class="rounded-lg border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400"
    >
      {{ !teProfessors ? 'No hi ha professors al departament' : 'No hi ha classes per distribuir' }}
    </div>

    <div v-else-if="!proposta" class="rounded-lg border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
      Fes clic a "Genera proposta" per veure una distribució suggerida
    </div>

    <template v-else>
      <div v-if="errorProposta" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
        {{ errorProposta }}
      </div>

      <!-- Stats -->
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div class="text-xl font-bold text-green-700">{{ statsIdeal }}</div>
          <div class="text-xs text-slate-500">A l'ideal</div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div class="text-xl font-bold text-amber-600">{{ statsOverIdeal }}</div>
          <div class="text-xs text-slate-500">Per sobre l'ideal</div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div class="text-xl font-bold text-blue-600">{{ statsUnderIdeal }}</div>
          <div class="text-xs text-slate-500">Per sota l'ideal</div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div
            class="text-xl font-bold"
            :class="totalHoresCobertes === totalHoresDepartament ? 'text-green-700' : 'text-rose-600'"
          >
            {{ totalHoresCobertes }}/{{ totalHoresDepartament }}h
          </div>
          <div class="text-xs text-slate-500">Hores del departament</div>
          <div class="mt-1 text-[11px] leading-snug text-slate-400">
            {{ totalHoresDistribuides }}/{{ totalHoresDisponibles }}h repartibles
            <span v-if="totalHoresNoDistribuibles > 0"> · {{ totalHoresNoDistribuibles }}h fixes</span>
          </div>
        </div>
      </div>

      <!-- Professor cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="slot in proposta"
          :key="slot.nom"
          class="rounded-lg border bg-white p-4 shadow-sm"
          :class="badgeBorderClass(slot)"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <h4 class="text-sm font-semibold leading-tight text-slate-900">{{ slot.nom }}</h4>
            <span
              class="shrink-0 rounded px-2 py-0.5 text-xs font-bold"
              :class="badgeClass(slot)"
            >{{ slot.hores }}h</span>
          </div>
          <p class="mb-3 text-xs text-slate-400">
            Ideal: {{ slot.ideal }}h · Màx: {{ slot.maxim }}h
            <span v-if="slot.horesFixades > 0" class="ml-1">({{ slot.horesFixades }}h fixes)</span>
          </p>

          <div v-if="slot.classesFixades.length || slot.classes.length" class="space-y-1">
            <!-- Fixed classes (coordination + already assigned) -->
            <div
              v-for="classe in sortClasses(slot.classesFixades)"
              :key="'fix-' + classe.id"
              class="flex items-baseline justify-between text-xs opacity-55"
            >
              <span class="mr-2 flex min-w-0 items-center gap-1.5 truncate italic text-slate-600">
                <span class="min-w-0 truncate">{{ classe.materia }}</span>
                <span
                  v-if="classe.tipus"
                  class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none not-italic"
                  :class="getTipusBadgeClass(classe.tipus)"
                >
                  {{ getTipusText(classe.tipus) }}
                </span>
                <span v-if="classe.curs || classe.grup" class="text-slate-400">
                  {{ classe.curs }} {{ classe.grup }}
                </span>
              </span>
              <span class="shrink-0 font-medium text-slate-400">{{ classe.hores }}h</span>
            </div>

            <!-- Divider -->
            <div
              v-if="slot.classesFixades.length && slot.classes.length"
              class="my-1.5 border-t border-dashed border-slate-200"
            />

            <!-- Newly assigned classes -->
            <div
              v-for="classe in sortClasses(slot.classes)"
              :key="classe.id"
              class="flex items-baseline justify-between text-xs"
            >
              <span class="mr-2 flex min-w-0 items-center gap-1.5 truncate text-slate-700">
                <span class="min-w-0 truncate">{{ classe.materia }}</span>
                <span
                  v-if="classe.tipus"
                  class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
                  :class="getTipusBadgeClass(classe.tipus)"
                >
                  {{ getTipusText(classe.tipus) }}
                </span>
                <span v-if="classe.curs || classe.grup" class="text-slate-400">
                  {{ classe.curs }} {{ classe.grup }}
                </span>
              </span>
              <span class="shrink-0 font-medium text-slate-500">{{ classe.hores }}h</span>
            </div>
          </div>
          <p v-else class="text-xs italic text-slate-400">Sense classes assignades</p>
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
import { esGP, esPALIC, esCoordinacio, esOptativaCompartida, getTipusText } from '../../utils/tipus';
import { trobarGermanesBloc } from '../../utils/grups';

const props = defineProps({
  professors: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
});

const NUM_ITERACIONS = 1500;

const proposta = ref(null);
const classesDesbordades = ref([]);
const errorProposta = ref('');
const partirActual = ref(true);

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

// Assignable classes: all except GP, PALIC, C, *Majors de 55, and *Dedicació a prefactura (all fixed)
const assignables = computed(() =>
  props.classes.filter(
    (c) =>
      !esGP(c.tipus) &&
      !esPALIC(c.tipus) &&
      !esCoordinacio(c.tipus) &&
      !esMajorDe55Classe(c) &&
      !esDedicacioPrefacturaClasse(c) &&
      !teTutoriaPrincipalParellada(c, props.classes)
  )
);

// Coordination classes: always fixed, always count toward hours
const classesCoordinacio = computed(() =>
  props.classes.filter((c) => esCoordinacio(c.tipus))
);

// Majors de 55 classes: always fixed, count toward the assigned teacher's hours
const classesMajors55 = computed(() =>
  props.classes.filter((c) => esMajorDe55Classe(c))
);

// *Dedicació a prefactura classes: always fixed (paired with cap d'estudis)
const classesDedicacioPrefactura = computed(() =>
  props.classes.filter((c) => esDedicacioPrefacturaClasse(c))
);

// Already-assigned non-C classes (only relevant when partirActual = true)
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

const totalClassesFixades = computed(
  () => classesCoordinacio.value.length + classesJaAssignades.value.length
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

// Total distributable hours (non-C, non-GP, non-PALIC)
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

const totalHoresDistribuides = computed(() =>
  classesUnicesProposta.value.reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
);

const totalHoresCobertes = computed(() =>
  totalHoresDistribuides.value + totalHoresNoDistribuibles.value
);

const totalHoresDesbordades = computed(() =>
  classesDesbordades.value.reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0)
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


function getTipusBadgeClass(tipus) {
  const normal = (tipus || '').toString().toUpperCase().trim();
  if (normal.startsWith('O') || normal.startsWith('T')) return 'bg-sky-50 text-slate-700 ring-1 ring-sky-200';
  if (normal === 'S') return 'bg-emerald-50 text-slate-700 ring-1 ring-emerald-200';
  if (normal === 'F') return 'bg-violet-50 text-slate-700 ring-1 ring-violet-200';
  if (normal === 'D' || /^A\d*$/.test(normal)) return 'bg-amber-50 text-slate-700 ring-1 ring-amber-200';
  if (normal === 'C') return 'bg-orange-50 text-slate-700 ring-1 ring-orange-200';
  return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
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

function classeEsAssignable(classe) {
  return (
    !esGP(classe.tipus) &&
    !esPALIC(classe.tipus) &&
    !esCoordinacio(classe.tipus) &&
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

function generar() {
  if (!teProfessors.value || !teClasses.value) return;
  errorProposta.value = '';
  classesDesbordades.value = [];

  const profLimits = professorsElegibles.value.map((p) => ({
    nom: p.nom,
    ideal: limitsHoresProfessor(p).ideal,
    maxim: limitsHoresProfessor(p).maxim,
  }));

  // Build fixed hours map: coord classes (always) + already-assigned classes (when partirActual)
  // horesEspecials tracks non-assignable fixed hours (coord + majors55 + dedicació)
  const fixatMap = new Map(
    profLimits.map((p) => [p.nom, { hores: 0, horesCoord: 0, horesEspecials: 0, classesFixades: [] }])
  );

  // 1. Coordination classes - always fixed, check participants[] too
  for (const classe of classesCoordinacio.value) {
    const profs = professorsDeClasse(classe);
    const h = Number(classe.hores) || 0;
    for (const nom of profs) {
      if (!fixatMap.has(nom)) continue;
      const entry = fixatMap.get(nom);
      entry.hores += h;
      entry.horesCoord += h;
      entry.horesEspecials += h;
      entry.classesFixades.push(classe);
    }
  }

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

  // 2. Already-assigned non-C classes (only when partirActual)
  const classesFixadesIds = new Set();
  for (const classe of classesJaAssignades.value) {
    if (classesFixadesIds.has(classe.id)) continue;
    const profs = professorsDeClasse(classe);
    const eligibleProfs = profs.filter((nom) => fixatMap.has(nom));
    // If all assigned professors are excluded (e.g. part-time), let the class be distributed
    if (eligibleProfs.length === 0) continue;
    const paquet = paquetClasses(classe);
    const h = paquet.reduce(
      (sum, item) => sum + horesComputablesPerProfessor(item, eligibleProfs.length),
      0
    );
    paquet.forEach((item) => classesFixadesIds.add(item.id));
    for (const nom of eligibleProfs) {
      const entry = fixatMap.get(nom);
      entry.hores += h;
      entry.classesFixades.push(...paquet);
    }
  }

  const perDistribuir = classesPerDistribuir.value;
  let millor = null;
  let millorScore = Infinity;
  let millorNoAssignades = [];

  for (let iter = 0; iter < NUM_ITERACIONS; iter++) {
    const shuffled = [...perDistribuir].sort(() => Math.random() - 0.5);
    const classesTractades = new Set(classesFixadesIds);
    const classesNoAssignades = [];

    const slots = profLimits.map((p) => {
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

    for (const classe of shuffled) {
      if (classesTractades.has(classe.id)) continue;
      const paquet = paquetClasses(classe);
      if (paquet.some((item) => classesTractades.has(item.id))) continue;
      const h = horesPaquetClasse(classe);
      paquet.forEach((item) => classesTractades.add(item.id));

      const candidats = [...slots].sort((a, b) => {
        const aDeficit = Math.max(a.ideal - a.hores, 0);
        const bDeficit = Math.max(b.ideal - b.hores, 0);
        if (aDeficit !== bDeficit) return bDeficit - aDeficit;
        return a.hores - b.hores;
      });

      let assignat = false;
      for (const slot of candidats) {
        if (slot.hores + h <= slot.maxim) {
          slot.hores += h;
          slot.classes.push(...paquet);
          assignat = true;
          break;
        }
      }

      if (!assignat) {
        classesNoAssignades.push(...paquet);
      }
    }

    const horesNoAssignades = classesNoAssignades.reduce((sum, classe) => sum + (Number(classe.hores) || 0), 0);
    const score = slots.reduce((sum, slot) => {
      const underIdeal = Math.max(slot.ideal - slot.hores, 0);
      const overIdeal = Math.max(slot.hores - slot.ideal, 0);
      const overMax = Math.max(slot.hores - slot.maxim, 0);
      return sum + underIdeal * underIdeal * 6 + overIdeal * overIdeal + overMax * overMax * 100000;
    }, horesNoAssignades * 10000);

    if (score < millorScore) {
      millorScore = score;
      millor = slots.map((slot) => ({ ...slot, classes: [...slot.classes] }));
      millorNoAssignades = [...classesNoAssignades];
    }
  }

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
}
</script>
