import { createApp } from "vue";
import LineageApp from "../src/LineageApp.vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from 'pinia';

const app = createApp(LineageApp)
provideVSCodeDesignSystem().register(allComponents);
app.use(createPinia());

app.mount("#app");
