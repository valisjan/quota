import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Admin from '../views/Admin.vue';
import Departament from '../views/Departament.vue';
import Resums from '../views/Resums.vue';
import DadesImportades from '../components/DadesImportades.vue';
import Sincronitzacio from '../components/Sincronitzacio.vue';
import ExportUntis from '../components/ExportUntis.vue';
import Tancament from '../components/Tancament.vue';
import UsuarisAdmin from '../components/UsuarisAdmin.vue';
import GestioCursos from '../components/GestioCursos.vue';
import { useAuthStore } from '../stores/auth';

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
      { path: 'sincronitzacio', component: Sincronitzacio },
      { path: 'untis', component: ExportUntis },
      { path: 'tancament', component: Tancament },
      { path: 'estat', redirect: '/resums' },
      { path: 'cursos', component: GestioCursos },
      { path: 'usuaris', component: UsuarisAdmin },
      { path: '', redirect: '/admin/cursos' },
    ],
  },
  {
    path: '/departament',
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

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  await authStore.waitForAuth();

  if (to.meta.requiresAdmin && !authStore.esAdmin()) {
    next('/');
  } else if (to.meta.requiresCapDepartament && !authStore.esCapDepartament()) {
    next('/');
  } else if (to.meta.requiresAuth && !authStore.estaAutenticat) {
    next('/');
  } else {
    next();
  }
});

export default router;
