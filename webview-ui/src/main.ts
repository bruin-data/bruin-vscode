import { createApp } from "vue";
import App from "./App.vue";
import "highlight.js/styles/github-dark-dimmed.css";
import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";
import RudderStackService from "./services/RudderStackService";

// RudderStack Configuration


const app = createApp(App);
// Create a plugin to make RudderStack available across the app
const RudderStackPlugin = {
  install(app) {
    app.config.globalProperties.$rudderStack = RudderStackService.getInstance();
  },
};
provideVSCodeDesignSystem().register(allComponents);

hljs.registerLanguage("sql", sql);
app.use(hljsVuePlugin);
app.use(createPinia());
app.use(RudderStackPlugin);
app.mount("#app");
