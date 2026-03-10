import { createApp } from "vue";
import QueryConsoleApp from "../src/QueryConsoleApp.vue";
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";

const app = createApp(QueryConsoleApp);
provideVSCodeDesignSystem().register(allComponents);
app.use(createPinia());

app.mount("#app");
