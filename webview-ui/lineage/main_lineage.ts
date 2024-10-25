import { createApp } from "vue";
import LineageApp from "../src/LineageApp.vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from 'pinia';

const app = createApp(LineageApp)
provideVSCodeDesignSystem().register(allComponents);

hljs.registerLanguage('sql', sql);
app.use(hljsVuePlugin);
app.use(createPinia());

app.mount("#app");
console.log("Were trying to find if we can have two index ");