<template>
  <div class="sections space-y-5">
    <AdminSectionNav v-model="activeSection" :items="sectionItems" mode="panels" />

    <!-- Estat del cicle del curs actiu: on som i què falta -->
    <section v-show="activeSection === 'estat-cicle'" id="estat-cicle" class="admin-anchor-section card p-5" data-testid="estat-cicle">
      <h3 class="font-bold text-slate-950 dark:text-white">Cicle del curs {{ etiquetaCursActiu }}</h3>
      <p class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
        Les fases es fan en aquest ordre a final de curs, per preparar el curs següent.
        <a href="/docs/tutorial-admin.html#canvi-de-curs" target="_blank" rel="noopener" class="ml-1 font-semibold text-primary hover:underline">
          Guia del canvi de curs ↗
        </a>
      </p>
      <ol class="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <li
          v-for="(fase, index) in fasesCicle"
          :key="fase.id"
          class="rounded-lg border p-3"
          :class="fase.fet ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-slate-950 dark:text-white">{{ index + 1 }}. {{ fase.titol }}</span>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="fase.fet ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'">
              {{ fase.fet ? 'Fet' : 'Pendent' }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">{{ fase.detall }}</p>
          <router-link :to="fase.to" class="mt-2 inline-block text-sm font-semibold text-primary hover:underline">{{ fase.accio }}</router-link>
        </li>
      </ol>
    </section>

    <div v-show="activeSection === 'crear-curs'" id="crear-curs" class="admin-anchor-section card p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-slate-950">Curs nou</h3>
          <p class="mt-0.5 text-sm text-slate-600">
            Següent curs: <strong>{{ cursSeguent }}</strong>
          </p>
        </div>
        <button
          @click="crearCurs"
          :disabled="!cursSeguent || creant || cursJaExisteix"
          class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {{ creant ? 'Creant...' : `Crea ${cursSeguent}` }}
        </button>
      </div>
      <label v-if="cursOrigenCopia && !cursJaExisteix" class="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input v-model="copiarDelCurs" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
        <span>
          Parteix de <strong>{{ cursOrigenCopia.nom || cursOrigenCopia.id }}</strong>: copia'n el professorat actiu i la quota
          (classes i hores), sense el repartiment. Després s'ajusten a Professorat i a Quota.
        </span>
      </label>
      <p v-if="cursJaExisteix" class="mt-2 text-sm font-medium text-amber-800">
        Aquest curs ja existeix.
      </p>
    </div>

    <div v-show="activeSection === 'neteja-assignacions'" id="neteja-assignacions" class="admin-anchor-section card p-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="font-bold text-slate-950">Neteja d'assignacions</h3>
          <p class="mt-1 text-sm text-slate-600">
            Reinicia el repartiment del curs actiu sense esborrar les dades importades.
          </p>
          <p class="mt-2 text-xs font-semibold text-slate-500">
            Curs actiu: {{ etiquetaCursActiu }}
          </p>
        </div>
        <button
          type="button"
          @click="confirmarBorratAssignacions(cursActiuPerOperacions)"
          :disabled="!cursActiuPerOperacions || Boolean(eliminantAssignacions)"
          class="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          {{ eliminantAssignacions ? 'Esborrant...' : 'Esborrar assignacions' }}
        </button>
      </div>
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
        Es buidaran professors assignats a classes, tutories, suports, desdoblaments, optatives i coordinacions.
        També es reiniciaran les guàrdies de pati, PALIC, suport divisible i desdoblament divisible assignats al professorat.
      </div>
    </div>

    <div v-show="activeSection === 'llistat-cursos'" id="llistat-cursos" class="admin-anchor-section overflow-hidden card">
      <div class="border-b border-slate-300 bg-slate-200 px-5 py-4">
        <h3 class="font-bold text-slate-950">Curs acadèmic</h3>
        <p class="mt-1 text-sm text-slate-600">
          Selecciona el curs actiu, bloqueja els tancats o elimina completament un curs de proves.
        </p>
      </div>

      <div v-if="cursStore.cursos.length === 0" class="p-5 text-sm text-slate-500">
        Encara no hi ha cap curs. Crea'n un per començar.
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="curs in cursStore.cursos"
          :key="curs.id"
          class="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          :class="curs.id === cursStore.cursActiuId ? 'bg-emerald-50/40' : ''"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-950">{{ curs.nom || curs.id }}</span>
              <span
                v-if="curs.id === cursStore.cursActiuId"
                class="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white"
              >actiu</span>
              <span
                v-if="curs.bloqueig"
                class="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white"
              >bloquejat</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="curs.id !== cursStore.cursActiuId"
              @click="cursStore.canviarCursActiu(curs.id)"
              class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Establir com a actiu
            </button>
            <button
              @click="toggleBloqueig(curs)"
              class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
              :class="curs.bloqueig
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'"
            >
              {{ curs.bloqueig ? 'Desbloquejar' : 'Bloquejar' }}
            </button>
            <button
              v-if="!esCursVigent(curs.id)"
              @click="confirmarBorratTotal(curs)"
              :disabled="eliminant === curs.id"
              class="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {{ eliminant === curs.id ? 'Esborrant...' : 'Borrat total' }}
            </button>
            <span v-else class="text-xs text-slate-500" title="Guàrdies, Pantalles i Retards en fan servir les dades">
              Curs vigent: no es pot esborrar
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="cursAssignacionsABorrar"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="tancarBorratAssignacions"
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 class="text-lg font-semibold text-red-700">Esborrar assignacions</h4>
        <p class="mt-2 text-sm text-slate-700">
          Aquesta acció deixarà sense professor assignat totes les classes i activitats del curs
          <strong>{{ cursAssignacionsABorrar.nom || cursAssignacionsABorrar.id }}</strong>.
          No elimina classes, professorat, departaments, configuració ni comptes.
        </p>

        <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <template v-if="carregantResumAssignacions">
            Calculant assignacions actuals...
          </template>
          <template v-else-if="errorResumAssignacions">
            No s'ha pogut calcular el resum: {{ errorResumAssignacions }}
          </template>
          <template v-else-if="resumAssignacions">
            Es netejaran {{ resumAssignacions.classesAmbAssignacions }} classes amb professorat assignat,
            {{ resumAssignacions.participantsCoordinacio }} participants de coordinacions,
            {{ resumAssignacions.gpAssignades }} guàrdies de pati i
            {{ resumAssignacions.palicAssignades }} hores PALIC,
            {{ resumAssignacions.sdAssignades || 0 }} hores de suport divisible i
            {{ resumAssignacions.ddAssignades || 0 }} hores de desdoblament divisible.
          </template>
        </div>

        <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No es pot desfer. Escriu exactament
          <strong>{{ textConfirmacioAssignacions }}</strong>
          per activar el botó.
        </div>
        <input
          v-model="confirmacioAssignacions"
          type="text"
          class="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-primary focus:ring-red-100"
          :placeholder="textConfirmacioAssignacions"
          @keyup.enter="potConfirmarAssignacions && eliminarAssignacions(cursAssignacionsABorrar)"
        />
        <div class="mt-5 flex justify-end gap-3">
          <button
            @click="tancarBorratAssignacions"
            :disabled="Boolean(eliminantAssignacions)"
            class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel·lar
          </button>
          <button
            @click="eliminarAssignacions(cursAssignacionsABorrar)"
            :disabled="!potConfirmarAssignacions || carregantResumAssignacions || Boolean(errorResumAssignacions) || eliminantAssignacions === cursAssignacionsABorrar.id"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ eliminantAssignacions === cursAssignacionsABorrar.id ? 'Esborrant...' : 'Esborrar assignacions' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="cursABorrarTotal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="tancarBorratTotal"
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h4 class="text-lg font-semibold text-red-700">Borrat total del curs acadèmic</h4>
        <p class="mt-2 text-sm text-slate-700">
          Aquesta acció eliminarà definitivament el curs
          <strong>{{ cursABorrarTotal.nom || cursABorrarTotal.id }}</strong>
          i tots els seus rastres: classes, professorat, departaments, configuració i mapeig Untis del curs.
          Fes-ho només amb un curs de proves o amb un que ja no faci servir cap aplicació.
        </p>
        <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <input
            v-model="eliminarPreautoritzats"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-800 focus:ring-red-500"
            :disabled="Boolean(eliminant)"
          />
          <span>
            Treu també el permís d'accés als professors d'aquest curs (Quota, Guàrdies i Retards).
            Deixa-ho desmarcat si continuen al centre.
          </span>
        </label>
        <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No es pot desfer. Escriu exactament
          <strong>{{ textConfirmacioBorrat }}</strong>
          per activar el botó de borrat.
        </div>
        <input
          v-model="confirmacioBorratTotal"
          type="text"
          class="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-primary focus:ring-red-100"
          :placeholder="textConfirmacioBorrat"
          @keyup.enter="potConfirmarBorrat && eliminarCurs(cursABorrarTotal)"
        />
        <div class="mt-5 flex justify-end gap-3">
          <button
            @click="tancarBorratTotal"
            :disabled="Boolean(eliminant)"
            class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel·lar
          </button>
          <button
            @click="eliminarCurs(cursABorrarTotal)"
            :disabled="!potConfirmarBorrat || eliminant === cursABorrarTotal.id"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ eliminant === cursABorrarTotal.id ? 'Esborrant...' : 'Esborrar-ho tot' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCursStore } from '../stores/curs';
import { useAuthStore } from '../stores/auth';
import { useCursCollectionSnapshot } from '../composables/useColSnapshot';
import { copiarProfessoratDeCurs, esCursVigent } from '../services/professorat';
import { carregarCatalegGestib, copiarQuotaDeCurs } from '../services/quota';
import { exclosaDelRepartiment, esCoordinacio } from '../utils/tipus';
import { formatDecimal } from '../utils/quota';
import { estatEnllac } from '../utils/gestibCorrespondencia';
import { useToastStore } from '../stores/toast';
import AdminSectionNav from './AdminSectionNav.vue';
import {
  eliminarAssignacionsCurs,
  obtenirResumAssignacionsCurs,
} from '../services/assignacionsCleanup';

const cursStore = useCursStore();
const authStore = useAuthStore();
const toast = useToastStore();
const creant = ref(false);
const activeSection = ref('estat-cicle');
const copiarDelCurs = ref(true);
const eliminant = ref(null);
const eliminantAssignacions = ref(null);
const cursABorrarTotal = ref(null);
const cursAssignacionsABorrar = ref(null);
const confirmacioBorratTotal = ref('');
const confirmacioAssignacions = ref('');
const eliminarPreautoritzats = ref(false);
const resumAssignacions = ref(null);
const carregantResumAssignacions = ref(false);
const errorResumAssignacions = ref('');
const textConfirmacioAssignacions = 'ESBORRAR ASSIGNACIONS';

const sectionItems = [
  {
    id: 'estat-cicle',
    label: 'Estat del cicle',
    description: 'Què està fet i què falta',
  },
  {
    id: 'crear-curs',
    label: 'Curs nou',
    description: "A partir de l'anterior",
  },
  {
    id: 'neteja-assignacions',
    label: 'Neteja',
    description: 'Reiniciar repartiment',
    tone: 'warning',
  },
  {
    id: 'llistat-cursos',
    label: 'Curs acadèmic',
    description: 'Actiu, bloqueig i borrat',
  },
];

const cursSeguent = computed(() => {
  if (cursStore.cursos.length === 0) return '2025/2026';
  const last = cursStore.cursos[0];
  const nom = last.nom || last.id.replace('-', '/');
  const match = nom.match(/(\d{4})\/(\d{4})/);
  if (!match) return '';
  const endYear = parseInt(match[2]);
  return `${endYear}/${endYear + 1}`;
});

// El curs del qual parteix el nou: el més recent dels que ja existeixen.
const cursOrigenCopia = computed(() => cursStore.cursos[0] || null);

// ─── Estat del cicle del curs actiu ─────────────────────────────────────────
const { items: professorsCurs } = useCursCollectionSnapshot({ colName: 'professors' });
const { items: classesCurs } = useCursCollectionSnapshot({ colName: 'classes' });
const { items: departamentsCurs } = useCursCollectionSnapshot({ colName: 'departaments' });

// El catàleg de GestIB del curs (places, matèries i activitats): es prepara abans que res.
const catalegCurs = ref(null);
watch(() => cursStore.cursActiuId, async (cursId) => {
  catalegCurs.value = null;
  if (!cursId) return;
  try {
    const carregat = await carregarCatalegGestib(cursId);
    if (cursStore.cursActiuId === cursId) catalegCurs.value = carregat?.cataleg || null;
  } catch {
    catalegCurs.value = null;
  }
}, { immediate: true });

const fasesCicle = computed(() => {
  const hores = classesCurs.value.reduce((suma, classe) => suma + (Number(classe.hores) || 0), 0);
  const assignables = classesCurs.value.filter((c) => !exclosaDelRepartiment(c.tipus) && !esCoordinacio(c.tipus));
  const senseAssignar = assignables.filter((c) => !c.professorAssignat && !c.professors?.length).length;
  const comptables = departamentsCurs.value.filter((d) => !d.exclos);
  const tancats = comptables.filter((d) => d.tancat).length;
  const cataleg = catalegCurs.value;
  const senseCorrespondencia = cataleg
    ? classesCurs.value.filter((classe) => estatEnllac(classe, cataleg).estat !== 'ok').length
    : classesCurs.value.length;
  return [
    {
      id: 'gestib',
      titol: 'GestIB',
      fet: Boolean(cataleg),
      detall: cataleg
        ? `${cataleg.places.length} places, ${cataleg.materies.length} matèries i ${cataleg.activitats.length} activitats.`
        : "Carrega l'XML de GestIB amb les places, matèries i activitats del curs.",
      to: '/admin/quota',
      accio: cataleg ? 'Obre la quota' : "Carrega l'XML",
    },
    {
      id: 'professorat',
      titol: 'Professorat',
      fet: professorsCurs.value.length > 0,
      detall: `${professorsCurs.value.length} professors actius.`,
      to: '/admin/professorat',
      accio: 'Obre Professorat',
    },
    {
      id: 'quota',
      titol: 'Quota',
      fet: classesCurs.value.length > 0 && Boolean(cataleg) && senseCorrespondencia === 0,
      detall: `${classesCurs.value.length} classes · ${formatDecimal(hores)} h`
        + (cataleg && senseCorrespondencia ? ` · ${senseCorrespondencia} sense correspondència amb GestIB.` : '.'),
      to: '/admin/quota',
      accio: 'Obre la quota',
    },
    {
      id: 'repartiment',
      titol: 'Repartiment',
      fet: comptables.length > 0 && tancats === comptables.length,
      detall: `${tancats} de ${comptables.length} departaments tancats · ${senseAssignar} ${senseAssignar === 1 ? 'classe' : 'classes'} sense professorat.`,
      to: '/departament',
      accio: 'Obre el repartiment',
    },
    {
      id: 'untis',
      titol: 'Untis',
      fet: assignables.length > 0 && senseAssignar === 0,
      detall: senseAssignar ? "Cal acabar el repartiment abans d'exportar." : 'Ja es poden generar els fitxers per a Untis.',
      to: '/admin/untis',
      accio: 'Prepara Untis',
    },
  ];
});

const cursJaExisteix = computed(() =>
  !!cursSeguent.value && cursStore.cursos.some(
    (c) => c.nom === cursSeguent.value || c.id === cursSeguent.value.replace('/', '-')
  )
);

const cursActiuPerOperacions = computed(() =>
  cursStore.cursActiu || (cursStore.cursActiuId ? { id: cursStore.cursActiuId, nom: cursStore.cursActiuId } : null)
);

const etiquetaCursActiu = computed(() =>
  cursActiuPerOperacions.value ? (cursActiuPerOperacions.value.nom || cursActiuPerOperacions.value.id) : 'cap curs seleccionat'
);

const textConfirmacioBorrat = computed(() =>
  cursABorrarTotal.value ? (cursABorrarTotal.value.nom || cursABorrarTotal.value.id) : ''
);

const potConfirmarBorrat = computed(() =>
  confirmacioBorratTotal.value.trim() === textConfirmacioBorrat.value
);

const potConfirmarAssignacions = computed(() =>
  confirmacioAssignacions.value.trim().toUpperCase() === textConfirmacioAssignacions
);

async function crearCurs() {
  if (!cursSeguent.value || cursJaExisteix.value) return;
  creant.value = true;
  const origen = copiarDelCurs.value ? cursOrigenCopia.value?.id : '';
  try {
    await cursStore.crearCurs(cursSeguent.value);
    const desti = cursSeguent.value.replace('/', '-');
    if (origen) {
      const actor = authStore.usuari || authStore.email || 'admin';
      const professorat = await copiarProfessoratDeCurs({ origen, desti, actor });
      const quota = await copiarQuotaDeCurs({ origen, desti, actor });
      toast.ok(`Curs ${cursSeguent.value} creat amb ${professorat.copiats} professors i ${quota.copiades} classes.`);
    } else {
      toast.ok(`Curs ${cursSeguent.value} creat correctament.`);
    }
    activeSection.value = 'estat-cicle';
  } catch (e) {
    toast.error('Error creant el curs: ' + e.message);
  } finally {
    creant.value = false;
  }
}

async function toggleBloqueig(curs) {
  try {
    await cursStore.setBloqueig(curs.id, !curs.bloqueig);
    const accio = curs.bloqueig ? 'desbloquejat' : 'bloquejat';
    toast.ok(`${curs.nom || curs.id} ${accio}.`);
  } catch (e) {
    toast.error('Error: ' + e.message);
  }
}

function confirmarBorratTotal(curs) {
  cursABorrarTotal.value = curs;
  confirmacioBorratTotal.value = '';
  eliminarPreautoritzats.value = true;
}

function tancarBorratTotal() {
  if (eliminant.value) return;
  cursABorrarTotal.value = null;
  confirmacioBorratTotal.value = '';
  eliminarPreautoritzats.value = true;
}

async function confirmarBorratAssignacions(curs) {
  if (!curs?.id) return;
  cursAssignacionsABorrar.value = curs;
  confirmacioAssignacions.value = '';
  resumAssignacions.value = null;
  errorResumAssignacions.value = '';
  carregantResumAssignacions.value = true;

  try {
    const resum = await obtenirResumAssignacionsCurs(curs.id);
    if (cursAssignacionsABorrar.value?.id === curs.id) {
      resumAssignacions.value = resum;
    }
  } catch (e) {
    if (cursAssignacionsABorrar.value?.id === curs.id) {
      errorResumAssignacions.value = e.message || String(e);
    }
  } finally {
    if (cursAssignacionsABorrar.value?.id === curs.id) {
      carregantResumAssignacions.value = false;
    }
  }
}

function tancarBorratAssignacions() {
  if (eliminantAssignacions.value) return;
  cursAssignacionsABorrar.value = null;
  confirmacioAssignacions.value = '';
  resumAssignacions.value = null;
  errorResumAssignacions.value = '';
  carregantResumAssignacions.value = false;
}

async function eliminarAssignacions(curs) {
  if (!curs?.id || !potConfirmarAssignacions.value || carregantResumAssignacions.value || errorResumAssignacions.value) return;
  const etiqueta = curs.nom || curs.id;
  eliminantAssignacions.value = curs.id;
  try {
    const resum = await eliminarAssignacionsCurs(curs.id);
    toast.ok(
      `Assignacions de ${etiqueta} esborrades: ${resum.classesActualitzades} classes i ${resum.professorsActualitzats} professors reiniciats.`
    );
    cursAssignacionsABorrar.value = null;
    confirmacioAssignacions.value = '';
    resumAssignacions.value = null;
    errorResumAssignacions.value = '';
  } catch (e) {
    toast.error('Error esborrant assignacions: ' + e.message);
  } finally {
    eliminantAssignacions.value = null;
  }
}

async function eliminarCurs(curs) {
  if (!curs || !potConfirmarBorrat.value) return;
  const etiqueta = curs.nom || curs.id;
  eliminant.value = curs.id;
  try {
    const resum = await cursStore.eliminarCurs(curs.id, {
      eliminarPreautoritzats: eliminarPreautoritzats.value,
    });
    const registres = Math.max((resum?.total || 1) - 1, 0);
    toast.ok(`Curs ${etiqueta} esborrat. S'han eliminat ${registres} registres associats.`);
    cursABorrarTotal.value = null;
    confirmacioBorratTotal.value = '';
    eliminarPreautoritzats.value = true;
  } catch (e) {
    toast.error('Error esborrant el curs: ' + e.message);
  } finally {
    eliminant.value = null;
  }
}
</script>
