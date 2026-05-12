import { ref } from 'vue';
import { defineStore } from 'pinia';

let nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);

  function add(message, type = 'info', duration = 4000) {
    const id = ++nextId;
    toasts.value.push({ id, message, type });
    setTimeout(() => remove(id), duration);
  }

  function remove(id) {
    const i = toasts.value.findIndex((t) => t.id === id);
    if (i !== -1) toasts.value.splice(i, 1);
  }

  return {
    toasts,
    remove,
    ok: (msg) => add(msg, 'ok'),
    error: (msg) => add(msg, 'error', 6000),
    info: (msg) => add(msg, 'info'),
  };
});
