<template>
  <div
    class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    :class="compact ? 'min-w-0 lg:w-[22rem]' : ''"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-success"></span>
        <p class="truncate text-sm font-bold text-slate-950">Usuaris connectats</p>
      </div>
      <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
        {{ usuaris.length }}
      </span>
    </div>

    <div v-if="usuaris.length" class="mt-3 space-y-2">
      <div
        v-for="usuari in usuarisLimitats"
        :key="usuari.id"
        class="flex min-w-0 items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2"
        :title="titleUsuari(usuari)"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {{ inicial(usuari) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-slate-950">
            {{ usuari.usuari }}
          </span>
          <span class="block truncate text-xs font-medium text-slate-600">
            {{ subtitol(usuari) }}
          </span>
        </span>
      </div>

      <p v-if="restants > 0" class="text-xs font-semibold text-slate-500">
        +{{ restants }} més
      </p>
    </div>

    <p v-else class="mt-3 text-sm font-medium text-slate-500">
      Cap usuari connectat ara mateix.
    </p>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { useCursStore } from '../stores/curs';
import { etiquetaAreaPresencia, etiquetaRolPresencia, subscribePresencia } from '../services/presencia';

const props = defineProps({
  limit: {
    type: Number,
    default: 6,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const cursStore = useCursStore();
const usuaris = ref([]);
let unsubscribe = null;

watch(
  () => cursStore.cursActiuId,
  (cursId) => {
    unsubscribe?.();
    usuaris.value = [];
    if (!cursId) return;
    unsubscribe = subscribePresencia(cursId, (value) => {
      usuaris.value = value;
    });
  },
  { immediate: true }
);

onUnmounted(() => {
  unsubscribe?.();
});

const usuarisLimitats = computed(() => usuaris.value.slice(0, props.limit));
const restants = computed(() => Math.max(0, usuaris.value.length - props.limit));

function inicial(usuari) {
  return (usuari.usuari || usuari.email || '?').toString().trim().charAt(0).toUpperCase();
}

function subtitol(usuari) {
  return [
    etiquetaRolPresencia(usuari.rol),
    usuari.departament,
    usuari.area || etiquetaAreaPresencia(usuari.path),
  ]
    .filter(Boolean)
    .join(' · ');
}

function titleUsuari(usuari) {
  return [usuari.usuari, usuari.email, subtitol(usuari)].filter(Boolean).join(' - ');
}
</script>
