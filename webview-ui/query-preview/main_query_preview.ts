import { createApp } from "vue";
import QueryPreviewApp from "../src/QueryPreviewApp.vue"
import 'highlight.js/styles/github-dark-dimmed.css';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";
 
const app = createApp(QueryPreviewApp)
provideVSCodeDesignSystem().register(allComponents);
app.use(createPinia());

app.mount("#app");
