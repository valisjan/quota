<template>
  <div
    class="print-hide pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-[calc(100vw-2rem)] items-start gap-3 rounded-lg px-4 py-3 shadow-lg sm:w-80"
        :class="{
          'bg-success text-white': toast.type === 'ok',
          'bg-red-600 text-white': toast.type === 'error',
          'bg-primary text-white': toast.type === 'info',
        }"
        role="status"
      >
        <span class="flex-1 text-sm font-semibold leading-snug">{{ toast.message }}</span>
        <button
          @click="store.remove(toast.id)"
          class="shrink-0 text-white/70 transition hover:text-white"
          aria-label="Tancar notificació"
        >
          &times;
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast';
const store = useToastStore();
</script>

<style>
.toast-enter-active { transition: all 0.2s ease-out; }
.toast-leave-active { transition: all 0.15s ease-in; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(0.5rem); }
</style>
