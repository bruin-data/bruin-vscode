import { createApp } from "vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import AssetLineagePanel from '@/AssetLineage.vue';

provideVSCodeDesignSystem().register(allComponents);

document.addEventListener('DOMContentLoaded', () => {
  // Always mount the unified lineage panel which internally handles
  // Asset, Pipeline, and Column-level views based on state.
  createApp(AssetLineagePanel).mount('#app');
});