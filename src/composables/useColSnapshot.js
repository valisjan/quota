import { ref, watch, onUnmounted } from 'vue';
import { onSnapshot } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { E2E_AUTH_BYPASS, getE2ECollection } from '../services/e2e';

function horaActual() {
  return new Date().toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function useColSnapshot(colName) {
  const cursStore = useCursStore();
  const items = ref([]);
  const error = ref(null);
  const isConnected = ref(true);
  const lastUpdate = ref(horaActual());
  let unsub = null;

  function setup() {
    unsub?.(); unsub = null;
    if (E2E_AUTH_BYPASS) {
      items.value = getE2ECollection(colName);
      error.value = null;
      isConnected.value = true;
      lastUpdate.value = horaActual();
      return;
    }
    if (!cursStore.cursActiuId) { items.value = []; return; }
    unsub = onSnapshot(
      cursStore.col(colName),
      snap => {
        items.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        isConnected.value = true;
        lastUpdate.value = horaActual();
      },
      err => { error.value = err; isConnected.value = false; }
    );
  }

  watch(() => cursStore.cursActiuId, setup, { immediate: true });
  onUnmounted(() => { unsub?.(); unsub = null; });

  return { items, error, isConnected, lastUpdate };
}
