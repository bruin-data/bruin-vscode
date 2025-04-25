import { createApp } from "vue";
import LineageApp from "../src/AssetLineage.vue";
import 'highlight.js/styles/github-dark-dimmed.css';
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import AssetLineagePanel from '@/AssetLineage.vue';
import PipelineLineagePanel from '@/PipelineLineage.vue';

provideVSCodeDesignSystem().register(allComponents);

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  const componentName = appElement?.getAttribute('data-component');

  if (componentName === 'AssetLineageFlow') {
    createApp(AssetLineagePanel).mount('#app');
  } else if (componentName === 'PipelineLineageFlow') {
    createApp(PipelineLineagePanel).mount('#app');
  } else {
    console.error('Unknown component type:', componentName);
  }
});