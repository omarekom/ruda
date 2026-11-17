import { createApp } from 'vue';
import App from './App.vue';
import './fonts';
import { i18n } from './i18n';
import './style.css';
import './styles/blocky.css';
import './styles/sketchy.css';

createApp(App).use(i18n).mount('#app');
