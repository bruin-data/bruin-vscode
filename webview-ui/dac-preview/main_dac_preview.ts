import { createApp } from "vue";
import DacPreviewApp from "../src/DacPreviewApp.vue";
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";

const app = createApp(DacPreviewApp);
provideVSCodeDesignSystem().register(allComponents);
app.use(createPinia());
app.mount("#app");
