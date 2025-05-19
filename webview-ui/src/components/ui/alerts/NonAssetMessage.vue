<template>
    <div class="non-asset-container p-4">
      <div class="convert-message">
        <div class="flex flex-col space-y-4">
          <div class="text-editor-fg text-lg font-semibold">Convert to Bruin Asset?</div>
          <p class="text-editor-fg">
            This file appears to be a potential Bruin asset but is not properly configured as one.
            Would you like to convert it to a Bruin asset?
          </p>
          <div class="flex space-x-3">
            <vscode-button appearance="primary" @click.once="convertToAsset">Convert to Asset</vscode-button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { vscode } from "@/utilities/vscode";
  import { defineProps, toRefs } from 'vue';
  
  const props = defineProps({
    showConvertMessage: {
      type: Boolean,
      default: false
    },
    fileType: {
      type: String,
      default: ''
    },
    filePath: {
      type: String,
      default: ''
    }
  });
  
  const { filePath } = toRefs(props);
  
  const convertToAsset = () => {
    vscode.postMessage({ 
      command: "bruin.convertToAsset",
      filePath: filePath.value
    });
  };
  
  </script>
  
  <style scoped>
  .non-asset-container {
    width: 100%;
    min-height: 200px;
  }
  </style>