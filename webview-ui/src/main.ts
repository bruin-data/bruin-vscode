import { createApp } from "vue";
import App from "./App.vue";
import "highlight.js/styles/github-dark-dimmed.css";
import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { createPinia } from "pinia";
import { RudderAnalytics } from "@rudderstack/analytics-js";

// RudderStack Configuration

const WRITE_KEY = "2q18Kcaed4aDOdwm2SRgz1vS6P6";
const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";

const rudderAnalytics = new RudderAnalytics();

try {
  rudderAnalytics.load(WRITE_KEY, DATA_PLANE_URL, {
    integrations: {
      All: true,
    },
    storage: {
      type: 'localStorage'
    },
    
    // Add logging to help diagnose issues
    logLevel: 'DEBUG'
  });
} catch (error) {
  console.error("RudderStack initialization error:", error);
}

console.log("RudderStack initialized:", rudderAnalytics);


const app = createApp(App);
// Create a plugin to make RudderStack available across the app
const RudderStackPlugin = {
  install(app) {
    app.config.globalProperties.$rudderStack = rudderAnalytics;
  },
};
provideVSCodeDesignSystem().register(allComponents);

hljs.registerLanguage("sql", sql);
app.use(hljsVuePlugin);
app.use(createPinia());
app.use(RudderStackPlugin);
app.mount("#app");
