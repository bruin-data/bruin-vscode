import { createApp } from "vue";
import App from "./App.vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from 'pinia';

const app = createApp(App)
provideVSCodeDesignSystem().register(allComponents);

hljs.registerLanguage('sql', sql);
app.use(hljsVuePlugin);
app.use(createPinia());

app.mount("#app");
