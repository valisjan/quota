<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import GuardiesTopBar from './GuardiesTopBar.vue';
import GuardiesWorkHeader from './GuardiesWorkHeader.vue';
import GuardiesSetupPanel from './GuardiesSetupPanel.vue';
import GuardiesPatiPanel from './GuardiesPatiPanel.vue';
import GuardiesConvivenciaPanel from './GuardiesConvivenciaPanel.vue';
import GuardiesWorkspace from './GuardiesWorkspace.vue';
import GuardiesTeacherStats from './GuardiesTeacherStats.vue';
import GuardiesGuardCountPanel from './GuardiesGuardCountPanel.vue';
import GuardiesTeacherExclusionsPanel from './GuardiesTeacherExclusionsPanel.vue';
import { signInGuardies } from '../../../src/services/guardiesStorage.js';
import { useGuardiesStore } from '../stores/guardies.js';

const store = useGuardiesStore();
const { canWrite, contextReady, authRequired, adminSection, teacherSection } = storeToRefs(store);
const signingIn = ref(false);
const signInError = ref('');

async function signIn() {
  signingIn.value = true;
  signInError.value = '';
  try {
    const signedIn = await signInGuardies();
    if (signedIn) window.location.reload();
    else signingIn.value = false;
  } catch (error) {
    signInError.value = error?.message || String(error);
    signingIn.value = false;
  }
}
</script>

<template>
  <GuardiesTopBar />
  <Teleport to="#guardies-work-header-root">
    <nav v-if="contextReady && canWrite" class="admin-view-tabs no-print" aria-label="Seccions de guàrdies" role="tablist">
      <button type="button" role="tab" :aria-selected="adminSection === 'daily'" :class="{ active: adminSection === 'daily' }" @click="store.adminSection = 'daily'">Gestió diària</button>
      <button type="button" role="tab" :aria-selected="adminSection === 'config'" :class="{ active: adminSection === 'config' }" @click="store.adminSection = 'config'">Configuració</button>
    </nav>
    <GuardiesWorkHeader v-show="(canWrite && adminSection === 'daily') || (!canWrite && teacherSection === 'daily')" />
  </Teleport>
  <Teleport to="#guardies-setup-root">
    <GuardiesSetupPanel v-show="canWrite && adminSection === 'config'" />
    <GuardiesTeacherExclusionsPanel v-show="canWrite && adminSection === 'config'" />
    <GuardiesGuardCountPanel v-show="canWrite && adminSection === 'config'" />
  </Teleport>
  <Teleport to="#guardies-convivencia-root">
    <GuardiesConvivenciaPanel v-show="canWrite && adminSection === 'config'" />
  </Teleport>
  <Teleport to="#guardies-pati-root">
    <GuardiesPatiPanel v-show="canWrite && adminSection === 'config'" />
  </Teleport>
  <Teleport v-if="contextReady && !canWrite" to="#guardies-setup-root">
    <section v-if="authRequired" class="guardies-auth-gate no-print">
      <button type="button" :disabled="signingIn" @click="signIn">{{ signingIn ? 'Connectant…' : 'Inicia sessió' }}</button>
      <p v-if="signInError" role="alert">{{ signInError }}</p>
    </section>
    <nav v-if="!authRequired" class="teacher-view-tabs no-print" aria-label="Vista del professorat" role="tablist">
      <button type="button" role="tab" :aria-selected="teacherSection === 'daily'" :class="{ active: teacherSection === 'daily' }" @click="store.teacherSection = 'daily'">Guàrdies del dia</button>
      <button type="button" role="tab" :aria-selected="teacherSection === 'stats'" :class="{ active: teacherSection === 'stats' }" @click="store.teacherSection = 'stats'">Guàrdies realitzades</button>
    </nav>
    <GuardiesTeacherStats v-show="!authRequired && teacherSection === 'stats'" />
  </Teleport>
  <Teleport to="#guardies-workspace-root">
    <GuardiesWorkspace />
  </Teleport>
</template>
