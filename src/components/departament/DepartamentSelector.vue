<template>
  <section class="mb-6 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-sm">
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
        class="group relative overflow-hidden rounded-lg border px-4 py-3 text-left transition"
        :class="dep.nom === modelValue
          ? 'border-primary bg-white shadow-primary-glow'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'"
        @click="seleccionarDepartament(dep.nom)"
      >
        <div class="flex items-start gap-3">
          <div
            class="dept-icon-box flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
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
              <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" :class="estatClass(dep.estat)">
                {{ estatText(dep.estat) }}
              </span>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span><strong class="font-semibold text-slate-800">{{ dep.professorsCount ?? 0 }}</strong> prof.</span>
              <span><strong class="font-semibold text-slate-800">{{ formatHores(dep.horesAssignades) }}/{{ formatHores(dep.totalHores) }}</strong> h</span>
              <span v-if="dep.classesPendents > 0" class="text-red-600">
                <strong class="font-semibold">{{ dep.classesPendents }}</strong> pendents
              </span>
            </div>

            <div class="mt-3 h-1.5 overflow-hidden rounded bg-slate-200">
              <div
                class="h-1.5 rounded transition-all"
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
import {
  departamentIconText,
  departamentFlagClass,
  departamentIconPaths,
  departamentInicials,
} from '../../utils/departamentIcon';

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

function iconText(dep) { return departamentIconText(dep.nom); }
function flagClass(dep) { return departamentFlagClass(dep.nom); }
function iconPaths(dep) { return departamentIconPaths(dep.nom); }
function inicials(nom) { return departamentInicials(nom); }

function iconClass(dep) {
  return 'border-slate-200 bg-white text-slate-600';
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
    complet: 'bg-emerald-100 text-emerald-700',
    pendent: 'bg-slate-100 text-slate-600',
    exces: 'bg-red-100 text-red-700',
    tancat: 'bg-slate-100 text-slate-500',
    buit: 'bg-slate-100 text-slate-400',
  };
  return classes[estat] || classes.pendent;
}

function barraClass(estat) {
  const classes = {
    complet: 'bg-emerald-400',
    pendent: 'bg-slate-300',
    exces: 'bg-red-400',
    tancat: 'bg-slate-200',
    buit: 'bg-slate-200',
  };
  return classes[estat] || classes.pendent;
}

function formatHores(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? number.toString() : number.toFixed(1);
}
</script>

<style scoped>
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
