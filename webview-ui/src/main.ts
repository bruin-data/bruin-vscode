import { createApp } from "vue";
import App from "./App.vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import hljsVuePlugin from '@highlightjs/vue-plugin';

const app = createApp(App)

hljs.registerLanguage('sql', sql);
app.use(hljsVuePlugin);

app.mount("#app");
