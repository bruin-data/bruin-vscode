<template>
  <div class="flow">
    <VueFlow
      :default-viewport="{ x: 150, y: 10, zoom: 1 }"
      :fit-view-on-init="false"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
        />
      </template>
      <Controls
        showZoom
        showFitView
        showInteractive
        class="custom-controls"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";

</script>
<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.flow {
  @apply flex h-screen w-full p-0 !important;
}
.vue-flow__controls {
  bottom: 1rem !important;
  left: 1rem !important;
  top: auto !important;
  right: auto !important;
  background-color: transparent !important;
  /* Force horizontal layout of buttons */
  display: flex !important;
  flex-direction: row !important;
  gap: 0.3rem;
}

.vue-flow__controls-button {
  @apply flex justify-center items-center p-0 border-solid border-notificationCenter-border bg-transparent rounded-md w-6 h-6 cursor-pointer hover:bg-editor-bg  !important;
}
.vue-flow__controls-button svg {
  @apply fill-current text-editor-fg !important;
}
.custom-controls .vue-flow__controls-button:hover {
  background-color: #444 !important;
}
</style>