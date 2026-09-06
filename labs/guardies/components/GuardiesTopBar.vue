<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGuardiesStore } from '../stores/guardies.js';

const dark = ref(document.documentElement.classList.contains('dark'));
const { courseId, isAdmin, teacherView } = storeToRefs(useGuardiesStore());
const viewHref = computed(() => {
  const query = new URLSearchParams();
  if (courseId.value) query.set('curs', courseId.value);
  if (!teacherView.value) query.set('vista', 'professor');
  const suffix = query.toString();
  return `/labs/guardies/${suffix ? `?${suffix}` : ''}`;
});

function toggleTheme() {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  localStorage.setItem('quota_theme', dark.value ? 'dark' : 'light');
  localStorage.setItem('darkMode', dark.value ? 'true' : 'false');
}
</script>

<template>
  <nav class="app-nav" aria-label="Navegació principal">
    <div class="nav-inner">
      <a class="brand" href="/">
        <img src="/logo_IESJSB_nav.png" alt="IES Josep Sureda i Blanes" />
        <span>
          <strong>QUOTA</strong>
          <small>IES Josep Sureda i Blanes</small>
        </span>
      </a>
      <div class="nav-tabs" aria-label="Seccions">
        <a href="/">Quota</a>
        <a class="active" href="/labs/guardies/" aria-current="page">Guàrdies</a>
        <a v-if="isAdmin" class="guardies-view-switch" :href="viewHref">{{ teacherView ? 'Torna a gestió' : 'Vista professorat' }}</a>
      </div>
      <button id="theme-toggle" type="button" class="theme-toggle" aria-label="Canvia el tema" @click="toggleTheme">
        <span class="theme-icon" aria-hidden="true">◐</span>
        <span id="theme-label">{{ dark ? 'Clar' : 'Fosc' }}</span>
      </button>
    </div>
    <div class="brand-strip" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
  </nav>
</template>
