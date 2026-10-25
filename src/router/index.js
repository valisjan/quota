import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const Home = () => import('../views/Home.vue');
const Admin = () => import('../views/Admin.vue');
const Departament = () => import('../views/Departament.vue');
const Informes = () => import('../views/Informes.vue');
const ExportUntis = () => import('../components/ExportUntis.vue');
const GestioCursos = () => import('../components/GestioCursos.vue');
const Configuracio = () => import('../components/Configuracio.vue');
const ProfessoratAdmin = () => import('../components/ProfessoratAdmin.vue');
const QuotaPanell = () => import('../components/QuotaPanell.vue');

const routes = [
  { path: '/', component: Home },
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAdmin: true },
    children: [
      { path: 'cursos', component: GestioCursos },
      { path: 'professorat', component: ProfessoratAdmin },
      { path: 'quota', component: QuotaPanell },
      { path: 'untis', component: ExportUntis },
      { path: 'parametres', component: Configuracio },
      // Adreces d'abans de la reorganització (i del full de càlcul), perquè els enllaços guardats funcionin.
      { path: 'professors', redirect: '/admin/professorat' },
      { path: 'usuaris', redirect: '/admin/professorat' },
      { path: 'classes', redirect: '/admin/quota' },
      { path: 'departaments', redirect: '/admin/quota' },
      { path: 'dades', redirect: '/admin/quota' },
      { path: 'sincronitzacio', redirect: '/admin/quota' },
      { path: 'configuracio', redirect: '/admin/parametres' },
      { path: 'consum', redirect: '/admin/cursos' },
      { path: 'tancament', redirect: '/departament' },
      { path: 'seguiment', redirect: '/informes' },
      { path: 'estat', redirect: '/informes' },
      { path: '', redirect: '/admin/cursos' },
    ],
  },
  {
    path: '/departament/:departament?',
    component: Departament,
    meta: { requiresCapDepartament: true },
  },
  {
    path: '/informes',
    component: Informes,
    meta: { requiresAuth: true },
  },
  { path: '/resums', redirect: '/informes' },
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
    return authStore.esCapDepartament() ? '/departament' : '/informes';
  }
  if (to.meta.requiresCapDepartament && !authStore.esCapDepartament()) return '/informes';
  if (to.meta.requiresAuth && !authStore.estaAutenticat) return '/';
  return true;
});

export default router;
