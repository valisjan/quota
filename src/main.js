import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { pinia } from './stores/pinia';
import { useAuthStore } from './stores/auth';
import './style.css';

const app = createApp(App);
app.use(pinia);

// Auth store sets up onAuthStateChanged, which initializes/stops cursStore
// automatically via useCursStore().inicialitzar() / .aturar() in its finally block.
useAuthStore(pinia);

app.use(router);
app.mount('#app');
