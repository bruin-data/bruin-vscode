import { createApp } from "vue";
import RunHistoryApp from "../src/RunHistoryApp.vue";
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";

const app = createApp(RunHistoryApp);
provideVSCodeDesignSystem().register(allComponents);
app.use(createPinia());

app.mount("#app");
