import { ref, watchEffect, onUnmounted, toValue } from 'vue';
import { onSnapshot } from 'firebase/firestore';
import { useCursStore } from '../stores/curs';
import { E2E_AUTH_BYPASS, getE2ECollection } from '../services/e2e';

function horaActual() {
  return new Date().toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const defaultMapDoc = (d) => ({ id: d.id, ...d.data() });

function filtrarItemsActivos(colName, items) {
  if (colName !== 'professors') return items;
  return items.filter((item) => !item.eliminatDelFull);
}

function itemsDesdeCache(colName, cache, ordre) {
  return filtrarItemsActivos(colName, ordre.map((id) => cache.get(id)).filter(Boolean));
}

function mouId(ordre, oldIndex, newIndex, id) {
  if (oldIndex >= 0) ordre.splice(oldIndex, 1);
  ordre.splice(newIndex, 0, id);
}

/**
 * Subscripció reactiva a una subcol·lecció del curs actiu.
 *
 * @param {object} opts
 * @param {string}   opts.colName        Nom de la subcol·lecció ('classes', 'professors'...)
 * @param {Function} [opts.queryFactory] (colRef) => Query  — afegeix where/orderBy, reactiu via watchEffect
 * @param {Function} [opts.mapDoc]       (DocumentSnapshot) => object  — transforma cada doc, per defecte { id, ...data() }
 * @param {boolean|Ref<boolean>|Function} [opts.enabled]  Desactiva la subscripció; per defecte true
 */
export function useCursCollectionSnapshot({
  colName,
  queryFactory = null,
  mapDoc = null,
  enabled = true,
} = {}) {
  const cursStore = useCursStore();
  const items = ref([]);
  const error = ref(null);
  const isConnected = ref(true);
  const lastUpdate = ref(horaActual());
  const loading = ref(true);
  const mapper = mapDoc ?? defaultMapDoc;

  const stopEffect = watchEffect((onCleanup) => {
    const isEnabled = toValue(enabled);
    const cursId = cursStore.cursActiuId; // dep reactiva: re-subscriu quan canvia el curs

    if (!isEnabled || !cursId) {
      items.value = [];
      loading.value = false;
      return;
    }

    if (E2E_AUTH_BYPASS) {
      items.value = filtrarItemsActivos(colName, getE2ECollection(colName));
      error.value = null;
      isConnected.value = true;
      lastUpdate.value = horaActual();
      loading.value = false;
      return;
    }

    loading.value = true;
    const colRef = cursStore.col(colName);
    // queryFactory pot accedir a refs/props reactius; watchEffect els rastreja automàticament
    const q = queryFactory ? queryFactory(colRef) : colRef;

    const cache = new Map();
    const ordre = [];

    const unsub = onSnapshot(
      q,
      (snap) => {
        for (const canvi of snap.docChanges()) {
          if (canvi.type === 'removed') {
            cache.delete(canvi.doc.id);
            ordre.splice(canvi.oldIndex, 1);
            continue;
          }

          cache.set(canvi.doc.id, mapper(canvi.doc));
          if (canvi.type === 'added') {
            ordre.splice(canvi.newIndex, 0, canvi.doc.id);
          } else if (canvi.oldIndex !== canvi.newIndex) {
            mouId(ordre, canvi.oldIndex, canvi.newIndex, canvi.doc.id);
          }
        }
        items.value = itemsDesdeCache(colName, cache, ordre);
        isConnected.value = true;
        lastUpdate.value = horaActual();
        loading.value = false;
        error.value = null;
      },
      (err) => {
        error.value = err;
        isConnected.value = false;
        loading.value = false;
      },
    );

    onCleanup(() => unsub());
  });

  // stopEffect cancel·la el watchEffect i fa el cleanup (unsub) de l'última subscripció
  onUnmounted(stopEffect);

  return { items, error, isConnected, lastUpdate, loading };
}

// Wrapper de compatibilitat per als components que ja usen useColSnapshot('colName')
export function useColSnapshot(colName) {
  return useCursCollectionSnapshot({ colName });
}
