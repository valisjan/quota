import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const Home = () => import('../views/Home.vue');
const Admin = () => import('../views/Admin.vue');
const Departament = () => import('../views/Departament.vue');
const Resums = () => import('../views/Resums.vue');
const DadesImportades = () => import('../components/DadesImportades.vue');
const ExportUntis = () => import('../components/ExportUntis.vue');
const Tancament = () => import('../components/Tancament.vue');
const UsuarisAdmin = () => import('../components/UsuarisAdmin.vue');
const GestioCursos = () => import('../components/GestioCursos.vue');
const Configuracio = () => import('../components/Configuracio.vue');
const AdminSeguiment = () => import('../components/AdminSeguiment.vue');
const ConsumPla = () => import('../components/ConsumPla.vue');

const routes = [
  { path: '/', component: Home },
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAdmin: true },
    children: [
      { path: 'classes', redirect: '/admin/dades' },
      { path: 'professors', redirect: '/admin/dades' },
      { path: 'departaments', redirect: '/admin/dades' },
      { path: 'dades', component: DadesImportades },
      { path: 'sincronitzacio', redirect: '/admin/dades' },
      { path: 'untis', component: ExportUntis },
      { path: 'tancament', component: Tancament },
      { path: 'parametres', component: Configuracio },
      { path: 'configuracio', redirect: '/admin/parametres' },
      { path: 'seguiment', component: AdminSeguiment },
      { path: 'consum', component: ConsumPla },
      { path: 'estat', redirect: '/admin/seguiment' },
      { path: 'cursos', component: GestioCursos },
      { path: 'usuaris', component: UsuarisAdmin },
      { path: '', redirect: '/admin/cursos' },
    ],
  },
  {
    path: '/departament/:departament?',
    component: Departament,
    meta: { requiresCapDepartament: true },
  },
  {
    path: '/resums',
    component: Resums,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function esErrorCarregaChunk(error) {
  const missatge = [
    error?.message,
    error?.name,
    error?.stack,
  ].filter(Boolean).join('\n');

  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|CSS_CHUNK_LOAD_FAILED/i.test(missatge);
}

router.onError((error, to) => {
  if (!esErrorCarregaChunk(error) || typeof window === 'undefined') return;

  const clauReload = 'quota_router_chunk_reload';
  const ara = Date.now();
  const ultimIntent = Number(sessionStorage.getItem(clauReload) || 0);
  if (ara - ultimIntent < 10000) return;

  sessionStorage.setItem(clauReload, String(ara));
  window.location.assign(to.fullPath || '/');
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.waitForAuth();

  if (to.meta.requiresAdmin && !authStore.esAdmin()) {
    return authStore.esCapDepartament() ? '/departament' : '/resums';
  }
  if (to.meta.requiresCapDepartament && !authStore.esCapDepartament()) return '/resums';
  if (to.meta.requiresAuth && !authStore.estaAutenticat) return '/';
  return true;
});

export default router;
