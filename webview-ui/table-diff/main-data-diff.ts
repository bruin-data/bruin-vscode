import { createApp } from "vue";
import TableDiffApp from "../src/TableDiffApp.vue"
import 'highlight.js/styles/github-dark-dimmed.css';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";

const app = createApp(TableDiffApp)
provideVSCodeDesignSystem().register(allComponents);

app.mount("#app");
