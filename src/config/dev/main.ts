import { createApp } from 'vue';
import App from '../App.vue';
import '../config.css';
import './dev.css';
import { installJellyfinDevMocks } from './mockJellyfin';

// `?lang=de` previews another language, the way Jellyfin Web sets <html lang>.
const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
if (requestedLanguage) {
  document.documentElement.lang = requestedLanguage;
}

installJellyfinDevMocks();
createApp(App).mount('#MediaPreviewConfigApp');
