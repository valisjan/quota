<template>
  <nav class="admin-section-nav" :aria-label="ariaLabel">
    <div class="admin-section-nav-heading">
      <div>
        <p class="admin-section-nav-kicker">{{ kicker }}</p>
        <h3 class="admin-section-nav-title">{{ title }}</h3>
      </div>

      <select
        class="admin-section-nav-select sm:hidden"
        :value="currentId"
        :aria-label="ariaLabel"
        @change="goToSection($event.target.value)"
      >
        <option v-for="item in items" :key="item.id" :value="item.id">
          {{ item.label }}
        </option>
      </select>
    </div>

    <div class="admin-section-nav-list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="admin-section-nav-item"
        :class="[
          currentId === item.id ? 'admin-section-nav-item-active' : '',
          item.tone ? `admin-section-nav-item-${item.tone}` : '',
        ]"
        @click="goToSection(item.id)"
      >
        <span class="admin-section-nav-label">{{ item.label }}</span>
        <span v-if="item.description" class="admin-section-nav-description">
          {{ item.description }}
        </span>
        <span v-if="item.badge" class="admin-section-nav-badge">
          {{ item.badge }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    default: 'Apartats',
  },
  kicker: {
    type: String,
    default: 'Navegació interna',
  },
  ariaLabel: {
    type: String,
    default: "Apartats d'aquesta zona",
  },
  modelValue: {
    type: String,
    default: '',
  },
  mode: {
    type: String,
    default: 'scroll',
    validator: (value) => ['scroll', 'panels'].includes(value),
  },
});

const emit = defineEmits(['update:modelValue']);

const activeId = ref(props.items[0]?.id || '');
let observer = null;

const observedIds = computed(() => props.items.map((item) => item.id));
const currentId = computed(() => props.modelValue || activeId.value || observedIds.value[0] || '');

function elementFor(id) {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id);
}

function setHash(id) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState({}, '', url);
}

function goToSection(id) {
  if (!observedIds.value.includes(id)) return;
  activeId.value = id;
  emit('update:modelValue', id);
  setHash(id);
  if (props.mode === 'panels') return;

  const el = elementFor(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function observeSections() {
  observer?.disconnect();
  observer = null;

  if (typeof IntersectionObserver === 'undefined') return;

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) activeId.value = visible.target.id;
    },
    { rootMargin: '-22% 0px -58% 0px', threshold: [0.08, 0.18, 0.32] }
  );

  observedIds.value.forEach((id) => {
    const el = elementFor(id);
    if (el) observer.observe(el);
  });
}

function syncFromHash() {
  if (typeof window === 'undefined') return;
  const id = decodeURIComponent(window.location.hash.replace('#', ''));
  if (id && observedIds.value.includes(id)) {
    activeId.value = id;
    emit('update:modelValue', id);
    if (props.mode !== 'panels') {
      requestAnimationFrame(() => elementFor(id)?.scrollIntoView({ block: 'start' }));
    }
  }
}

onMounted(() => {
  syncFromHash();

  if (props.mode !== 'panels') observeSections();

  window.addEventListener('hashchange', syncFromHash);
});

watch(
  () => props.items.map((item) => item.id).join('|'),
  async () => {
    if (!observedIds.value.includes(currentId.value)) {
      const fallback = observedIds.value[0] || '';
      activeId.value = fallback;
      emit('update:modelValue', fallback);
    }
    await nextTick();
    if (props.mode !== 'panels') observeSections();
  }
);

watch(
  () => props.modelValue,
  (value) => {
    if (value && observedIds.value.includes(value)) activeId.value = value;
  },
  { immediate: true }
);

onUnmounted(() => {
  observer?.disconnect();
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', syncFromHash);
  }
});
</script>
