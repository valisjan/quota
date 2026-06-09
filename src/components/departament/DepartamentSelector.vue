<template>
  <section class="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase text-primary">Departaments</p>
        <h2 class="mt-1 text-xl font-semibold text-slate-950">Espai de distribució</h2>
        <p class="mt-1 text-sm font-medium text-slate-600">
          Canvia de departament des del mateix mapa de treball.
        </p>
      </div>

      <label class="w-full lg:max-w-xs">
        <span class="sr-only">Cerca departament</span>
        <input
          v-model.trim="cerca"
          type="search"
          class="form-input w-full"
          placeholder="Cerca departament..."
        />
      </label>
    </div>

    <div
      v-if="departamentsFiltrats.length"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      role="listbox"
      aria-label="Departaments disponibles"
    >
      <button
        v-for="dep in departamentsFiltrats"
        :key="dep.id || dep.nom"
        type="button"
        role="option"
        :aria-selected="dep.nom === modelValue"
        class="group relative overflow-hidden rounded-lg border p-4 text-left transition"
        :class="dep.nom === modelValue
          ? 'border-primary bg-blue-50 shadow-primary-glow'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'"
        @click="seleccionarDepartament(dep.nom)"
      >
        <div class="flex items-start gap-3">
          <div
            class="dept-icon-box flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border"
            :class="[iconClass(dep), { 'dept-icon-box-active': dep.nom === modelValue }]"
          >
            <span
              v-if="iconText(dep)"
              class="dept-icon-text"
              :class="{ 'dept-icon-text-small': iconText(dep).length > 1 }"
            >
              {{ iconText(dep) }}
            </span>
            <span
              v-else-if="flagClass(dep)"
              class="dept-flag"
              :class="flagClass(dep)"
              aria-hidden="true"
            ></span>
            <svg
              v-else-if="iconPaths(dep).length"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <path
                v-for="path in iconPaths(dep)"
                :key="path"
                stroke-linecap="round"
                stroke-linejoin="round"
                :d="path"
              />
            </svg>
            <span v-else class="text-sm font-black">{{ inicials(dep.nom) }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-base font-semibold leading-tight text-slate-950">
                {{ dep.nom }}
              </h3>
              <span class="rounded-md px-2 py-1 text-[11px] font-bold" :class="estatClass(dep.estat)">
                {{ estatText(dep.estat) }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-md bg-slate-50 px-2 py-1.5">
                <p class="text-[11px] font-semibold text-slate-500">Prof.</p>
                <p class="text-sm font-bold text-slate-950">{{ dep.professorsCount ?? 0 }}</p>
              </div>
              <div class="rounded-md bg-slate-50 px-2 py-1.5">
                <p class="text-[11px] font-semibold text-slate-500">Hores</p>
                <p class="text-sm font-bold text-slate-950">{{ formatHores(dep.horesAssignades) }}/{{ formatHores(dep.totalHores) }}</p>
              </div>
              <div class="rounded-md bg-slate-50 px-2 py-1.5">
                <p class="text-[11px] font-semibold text-slate-500">Pend.</p>
                <p class="text-sm font-bold text-slate-950">{{ dep.classesPendents ?? 0 }}</p>
              </div>
            </div>

            <div class="mt-3 h-2 overflow-hidden rounded bg-slate-200">
              <div
                class="h-2 rounded transition-all"
                :class="barraClass(dep.estat)"
                :style="{ width: `${dep.percentatge || 0}%` }"
              ></div>
            </div>
          </div>
        </div>
      </button>
    </div>

    <div v-else class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p class="font-semibold text-slate-950">No hi ha cap departament amb aquest filtre.</p>
      <button type="button" class="mt-2 text-sm font-semibold text-primary hover:underline" @click="cerca = ''">
        Neteja la cerca
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  departaments: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const cerca = ref('');

const departamentsFiltrats = computed(() => {
  const text = normalitza(cerca.value);
  if (!text) return props.departaments;
  return props.departaments.filter((dep) => normalitza(dep.nom).includes(text));
});

function seleccionarDepartament(nom) {
  emit('update:modelValue', nom);
  cerca.value = '';
}

function normalitza(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoria(dep) {
  const nom = normalitza(dep.nom);
  if (/catala/.test(nom)) return 'catala';
  if (/angles/.test(nom)) return 'angles';
  if (/frances/.test(nom)) return 'frances';
  if (/alemany/.test(nom)) return 'alemany';
  if (/castella/.test(nom)) return 'castella';
  if (/(cultura classica|cultura clasica|classic|clasic|latin|grec)/.test(nom)) return 'classiques';
  if (/lleng/.test(nom)) return 'llengues';
  if (/(matemat|mates)/.test(nom)) return 'mates';
  if (/(agraria|agrari|agric|jardi|forestal|hort)/.test(nom)) return 'agraria';
  if (/(biologia|geologia|\bbg\b)/.test(nom)) return 'biogeo';
  if (/(fisica|quimica|\bfq\b)/.test(nom)) return 'fisicaQuimica';
  if (/cienc/.test(nom)) return 'ciencies';
  if (/(geografia|historia|social)/.test(nom)) return 'socials';
  if (/(tecnologia|informatica|digital)/.test(nom)) return 'tecnologia';
  if (/(musica|arts esceniques)/.test(nom)) return 'musica';
  if (/(plastica|dibuix|visual|art)/.test(nom)) return 'arts';
  if (/(educacio fisica|esport)/.test(nom)) return 'ef';
  if (/(orientacio|orientador|suport)/.test(nom)) return 'orientacio';
  if (/(religio|religion)/.test(nom)) return 'religio';
  if (/(filosofia|valors)/.test(nom)) return 'humanitats';
  if (/(economia|empresa|administracio)/.test(nom)) return 'economia';
  if (/(^|\s)ia($|\s)|pastisser|forn|fleca|aliment|cuina|hostaleria/.test(nom)) return 'pastisseria';
  return 'generic';
}

function iconPaths(dep) {
  const icons = {
    castella: [
      'M12 11.75c2.15 0 3.9-1.75 3.9-3.9S14.15 3.95 12 3.95 8.1 5.7 8.1 7.85s1.75 3.9 3.9 3.9Z',
      'M6.25 20.25c.65-3.75 2.75-6 5.75-6s5.1 2.25 5.75 6',
      'M7.25 11.25c1.25.95 2.8 1.45 4.75 1.45s3.5-.5 4.75-1.45',
      'M17.6 4.9c1.15.7 1.9 1.85 1.9 3.1 0 1.65-1.25 3.05-3 3.65M6.4 4.9C5.25 5.6 4.5 6.75 4.5 8c0 1.65 1.25 3.05 3 3.65',
    ],
    llengues: [
      'M4.5 5.25A2.25 2.25 0 0 1 6.75 3H20v16.5H6.75a2.25 2.25 0 0 0-2.25 2.25V5.25Z',
      'M8 7.5h8M8 11h6M6.75 19.5V3',
    ],
    mates: [
    ],
    classiques: [
      'M5.5 20.25h13M7 17.5h10M8.25 17.5V8.25M15.75 17.5V8.25',
      'M6.75 8.25h10.5L12 3.75 6.75 8.25Z',
      'M9.5 11h5M9.5 13.5h5',
    ],
    agraria: [
      'M12 20.5V10.75',
      'M12 14.25c-3.75 0-6.25-2.2-6.25-5.5V6.5H8c3.3 0 4 2.3 4 7.75Z',
      'M12 16.25c3.75 0 6.25-2.2 6.25-5.5V8.5H16c-3.3 0-4 2.3-4 7.75Z',
      'M8 20.5h8',
    ],
    biogeo: [
      'M6.5 19.5c6.75 0 11-4.4 11-11.5V4.5H14c-7.1 0-11.5 4.25-11.5 11 0 2.2 1.8 4 4 4Z',
      'M6.5 19.5c2.5-5.25 5.75-8.5 11-11',
      'M14.75 19.25a5.5 5.5 0 0 0 3.75-5.2 5.5 5.5 0 0 0-3.75 5.2Z',
    ],
    fisicaQuimica: [
      'M12 12m-2.25 0a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 1 0-4.5 0',
      'M4.75 12c2.15-3.75 4.6-5.75 7.25-5.75s5.1 2 7.25 5.75c-2.15 3.75-4.6 5.75-7.25 5.75S6.9 15.75 4.75 12Z',
      'M7.25 5.75c4.2.3 7.7 4.1 9.5 12.5M16.75 5.75c-4.2.3-7.7 4.1-9.5 12.5',
    ],
    ciencies: [
      'M10 3.75v5.4l-4.4 7.65A2.25 2.25 0 0 0 7.55 20.25h8.9a2.25 2.25 0 0 0 1.95-3.45L14 9.15v-5.4',
      'M8.5 3.75h7M8.25 15.5h7.5',
    ],
    socials: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M3.75 12h16.5M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18',
    ],
    tecnologia: [
      'M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8A3.5 3.5 0 0 1 16 19.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5Z',
      'M9 9h6v6H9V9ZM9 2.75v2M15 2.75v2M9 19.25v2M15 19.25v2M2.75 9h2M2.75 15h2M19.25 9h2M19.25 15h2',
    ],
    musica: [
      'M9 18.75a2.25 2.25 0 1 1-2.25-2.25A2.25 2.25 0 0 1 9 18.75ZM18 16.5a2.25 2.25 0 1 1-2.25-2.25A2.25 2.25 0 0 1 18 16.5Z',
      'M9 18.75V6l9-1.5v12',
    ],
    arts: [
      'M12 20.25a8.25 8.25 0 1 1 8.25-8.25c0 1.1-.9 1.75-2 1.75h-1.5a1.75 1.75 0 0 0-1.75 1.75c0 1.1.65 2 1.75 2 .7 0 1.25.5 1.25 1.15 0 1.05-2.65 1.85-6 1.85Z',
      'M7.75 10.25h.01M10.5 7.75h.01M14 7.75h.01M16.25 10.5h.01',
    ],
    ef: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M4.5 9.75c3.1.45 5.7-.3 7.5-2.25 1.8 1.95 4.4 2.7 7.5 2.25',
      'M7.25 19.25c-.5-3.55.7-6.05 4.75-7.25 4.05 1.2 5.25 3.7 4.75 7.25',
      'M12 3v18',
    ],
    orientacio: [
      'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
      'm10 14 2-6 2 6-2-1-2 1Z',
    ],
    humanitats: [
      'M5.5 6.5h13M5.5 11h13M5.5 15.5h8',
      'M4 3.75h16v16.5H4V3.75Z',
    ],
    religio: [
      'M12 3.75v16.5',
      'M7.75 8.25h8.5',
      'M6.5 20.25h11',
      'M8.75 14.75c.9-1.7 2-2.55 3.25-2.55s2.35.85 3.25 2.55',
    ],
    economia: [
      'M4 9h16M6 9V7l6-3 6 3v2M7 9v8M12 9v8M17 9v8M5 17h14M4 20h16',
    ],
    pastisseria: [
      'M4.25 14.5c.5-3.95 3.9-7 7.75-7s7.25 3.05 7.75 7c.2 1.6-.95 3-2.55 3H6.8c-1.6 0-2.75-1.4-2.55-3Z',
      'M7.25 14.25c.35-1.3 1.3-2.25 2.5-2.25 1.1 0 1.85.65 2.25 1.55.4-.9 1.15-1.55 2.25-1.55 1.2 0 2.15.95 2.5 2.25',
      'M6 17.5h12',
    ],
  };
  return icons[categoria(dep)] || [];
}

function iconClass(dep) {
  const classes = {
    catala: 'border-red-200 bg-yellow-50 text-red-700',
    angles: 'border-blue-200 bg-blue-50 text-blue-700',
    frances: 'border-blue-200 bg-blue-50 text-blue-700',
    alemany: 'border-amber-200 bg-amber-50 text-slate-800',
    castella: 'border-blue-200 bg-blue-50 text-blue-700',
    llengues: 'border-blue-200 bg-blue-50 text-blue-700',
    mates: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    classiques: 'border-stone-300 bg-stone-100 text-stone-700',
    agraria: 'border-green-200 bg-green-50 text-green-700',
    biogeo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    fisicaQuimica: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    ciencies: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    socials: 'border-amber-200 bg-amber-50 text-amber-700',
    tecnologia: 'border-slate-300 bg-slate-100 text-slate-700',
    musica: 'border-purple-200 bg-purple-50 text-purple-700',
    arts: 'border-rose-200 bg-rose-50 text-rose-700',
    ef: 'border-orange-200 bg-orange-50 text-orange-700',
    orientacio: 'border-teal-200 bg-teal-50 text-teal-700',
    humanitats: 'border-violet-200 bg-violet-50 text-violet-700',
    religio: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    economia: 'border-lime-200 bg-lime-50 text-lime-700',
    pastisseria: 'border-orange-200 bg-orange-50 text-orange-700',
    generic: 'border-slate-300 bg-slate-100 text-slate-700',
  };
  return classes[categoria(dep)] || classes.generic;
}

function iconText(dep) {
  const textos = {
    castella: '✒',
    llengues: 'abc',
    mates: 'πe',
    classiques: 'ΑΩ',
    agraria: '🌱',
    biogeo: '🌿',
    fisicaQuimica: '⚛',
    ciencies: '🧪',
    socials: '🌍',
    tecnologia: '⚙',
    musica: '♪',
    arts: '🎨',
    ef: '⚽',
    orientacio: '🧭',
    humanitats: 'Φ',
    religio: '✝',
    economia: '€',
    pastisseria: '🥐',
  };
  return textos[categoria(dep)] || '';
}

function flagClass(dep) {
  const flags = {
    catala: 'dept-flag-catala',
    angles: 'dept-flag-angles',
    frances: 'dept-flag-frances',
    alemany: 'dept-flag-alemany',
  };
  return flags[categoria(dep)] || '';
}

function inicials(nom) {
  return (nom || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'D';
}

function estatText(estat) {
  const textos = {
    complet: 'Complet',
    pendent: 'Pendent',
    exces: 'Excés',
    tancat: 'Tancat',
    buit: 'Sense dades',
  };
  return textos[estat] || 'Obert';
}

function estatClass(estat) {
  const classes = {
    complet: 'bg-emerald-100 text-emerald-800',
    pendent: 'bg-amber-100 text-amber-800',
    exces: 'bg-rose-100 text-rose-800',
    tancat: 'bg-slate-200 text-slate-800',
    buit: 'bg-slate-100 text-slate-600',
  };
  return classes[estat] || classes.pendent;
}

function barraClass(estat) {
  const classes = {
    complet: 'bg-emerald-500',
    pendent: 'bg-amber-500',
    exces: 'bg-rose-500',
    tancat: 'bg-slate-500',
    buit: 'bg-slate-300',
  };
  return classes[estat] || classes.pendent;
}

function formatHores(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? number.toString() : number.toFixed(1);
}
</script>

<style scoped>
.dept-flag {
  display: block;
  width: 1.8rem;
  height: 1.2rem;
  overflow: hidden;
  border-radius: 0.2rem;
  box-shadow: 0 0 0 1px rgb(15 23 42 / 0.14), 0 1px 3px rgb(15 23 42 / 0.16);
}

.dept-icon-box svg,
.dept-icon-text,
.dept-flag {
  animation: dept-icon-idle 3.6s ease-in-out infinite;
  transition: transform 160ms ease;
  transform-origin: center;
}

.group:hover .dept-icon-box svg,
.group:hover .dept-icon-text,
.group:hover .dept-flag {
  transform: translateY(-1px) rotate(-2deg) scale(1.05);
}

.dept-icon-box-active svg,
.dept-icon-box-active .dept-icon-text,
.dept-icon-box-active .dept-flag {
  animation: dept-icon-float 2.1s ease-in-out infinite;
}

.dept-icon-text {
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.dept-icon-text-small {
  font-size: 1.05rem;
}

.dept-flag-catala {
  position: relative;
  background: repeating-linear-gradient(
    to bottom,
    #facc15 0,
    #facc15 0.18rem,
    #dc2626 0.18rem,
    #dc2626 0.36rem
  );
}

.dept-flag-catala::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 0.72rem;
  height: 0.72rem;
  background: #6d28d9;
}

.dept-flag-catala::after {
  content: "";
  position: absolute;
  left: 0.17rem;
  top: 0.2rem;
  width: 0.38rem;
  height: 0.28rem;
  background: #ffffff;
  box-shadow:
    0 -0.1rem 0 -0.02rem #ffffff,
    -0.12rem 0.13rem 0 -0.03rem #ffffff,
    0.12rem 0.13rem 0 -0.03rem #ffffff;
}

.dept-flag-angles {
  background:
    linear-gradient(90deg, transparent 42%, #dc2626 42%, #dc2626 58%, transparent 58%),
    linear-gradient(0deg, transparent 38%, #dc2626 38%, #dc2626 62%, transparent 62%),
    linear-gradient(90deg, transparent 35%, #ffffff 35%, #ffffff 65%, transparent 65%),
    linear-gradient(0deg, transparent 30%, #ffffff 30%, #ffffff 70%, transparent 70%),
    #1d4ed8;
}

.dept-flag-frances {
  background: linear-gradient(90deg, #1d4ed8 0 33.33%, #ffffff 33.33% 66.66%, #dc2626 66.66%);
}

.dept-flag-alemany {
  background: linear-gradient(to bottom, #111827 0 33.33%, #dc2626 33.33% 66.66%, #facc15 66.66%);
}

@keyframes dept-icon-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(-2deg);
  }
}

@keyframes dept-icon-idle {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  45% {
    transform: translateY(-2px) rotate(-1.2deg);
  }
  65% {
    transform: translateY(1px) rotate(0.8deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dept-icon-box svg,
  .dept-icon-text,
  .dept-flag {
    transition: none;
  }

  .group:hover .dept-icon-box svg,
  .group:hover .dept-icon-text,
  .group:hover .dept-flag,
  .dept-icon-box-active svg,
  .dept-icon-box-active .dept-icon-text,
  .dept-icon-box-active .dept-flag {
    animation: none;
    transform: none;
  }
}
</style>
