import { createApp } from 'vue';
import App from '../App.vue';
import '../config.css';
import './dev.css';
import { installJellyfinDevMocks } from './mockJellyfin';

installJellyfinDevMocks();
createApp(App).mount('#MediaPreviewConfigApp');
