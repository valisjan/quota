<template>
  <div class="relative" ref="containerRef">
    <div class="relative flex items-center">
      <input
        ref="inputRef"
        type="text"
        v-model="query"
        @focus="obrir"
        @keydown.escape.stop="tancar"
        @keydown.enter.prevent="seleccionarActiu"
        @keydown.down.prevent="moureActiu(1)"
        @keydown.up.prevent="moureActiu(-1)"
        :placeholder="etiquetaActual || placeholder"
        :class="[
          'form-input w-full py-1.5 pr-7 text-sm',
          etiquetaActual && !query
            ? 'placeholder:font-medium placeholder:text-slate-800 dark:placeholder:text-slate-100'
            : 'placeholder:text-slate-400',
        ]"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        v-if="modelValue"
        @mousedown.prevent="netejar"
        class="absolute right-2 text-lg leading-none text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
        tabindex="-1"
        title="Esborra selecció"
      >x</button>
    </div>

    <div
      v-if="obert"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-gray-900"
    >
      <template v-if="opcionsFiltrades.length">
        <button
          v-for="(opcio, i) in opcionsFiltrades"
          :key="opcio.value"
          @mousedown.prevent="seleccionar(opcio)"
          class="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm"
          :class="i === actiu
            ? 'bg-primary text-white'
            : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-gray-800'"
        >
          <span
            class="shrink-0 font-mono text-xs"
            :class="i === actiu ? 'text-blue-200' : 'text-slate-600 dark:text-slate-400'"
          >{{ opcio.value }}</span>
          <span class="min-w-0 truncate">{{ opcio.nom }}</span>
          <span v-if="opcio.suggerit" class="ml-auto shrink-0 opacity-60 dark:opacity-50">&#9733;</span>
        </button>
      </template>
      <p v-else class="px-3 py-3 text-sm text-slate-500 dark:text-slate-500">
        Cap resultat per a "{{ query }}"
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  opcions: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Cerca o selecciona...' },
});
const emit = defineEmits(['update:modelValue']);

const query = ref('');
const obert = ref(false);
const actiu = ref(-1);
const containerRef = ref(null);

const etiquetaActual = computed(() => {
  if (!props.modelValue) return '';
  const o = props.opcions.find((op) => op.value === props.modelValue);
  return o ? `${o.value} · ${o.nom}` : props.modelValue;
});

function netNorm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const opcionsFiltrades = computed(() => {
  const q = netNorm(query.value);
  const llista = q
    ? props.opcions.filter((o) => netNorm(`${o.value} ${o.nom}`).includes(q))
    : props.opcions.filter((o, i) => o.suggerit || i < 40);
  return llista.slice(0, 60);
});

watch(() => props.modelValue, () => { query.value = ''; });

function obrir() { obert.value = true; actiu.value = -1; }
function tancar() { obert.value = false; query.value = ''; actiu.value = -1; }

function seleccionar(opcio) {
  emit('update:modelValue', opcio.value);
  tancar();
}

function netejar() {
  emit('update:modelValue', '');
  query.value = '';
  obert.value = false;
}

function seleccionarActiu() {
  const llista = opcionsFiltrades.value;
  const target = actiu.value >= 0 ? llista[actiu.value] : llista.length === 1 ? llista[0] : null;
  if (target) seleccionar(target);
}

function moureActiu(delta) {
  const max = opcionsFiltrades.value.length - 1;
  if (max < 0) return;
  actiu.value = actiu.value < 0
    ? (delta > 0 ? 0 : max)
    : Math.max(0, Math.min(max, actiu.value + delta));
}

function clickFora(e) {
  if (!containerRef.value?.contains(e.target)) tancar();
}

onMounted(() => document.addEventListener('mousedown', clickFora));
onUnmounted(() => document.removeEventListener('mousedown', clickFora));
</script>
