<template>
    <div class="info-banner rounded p-2 my-2 border">
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2 flex-grow">
          <span class="codicon codicon-info"></span>
          <p class="text-xs m-0">{{ props.message }}</p>
        </div>
        <vscode-button appearance="icon" @click="$emit('infoClose')" title="Close" class="ml-2">
          <span class="codicon codicon-close"></span>
        </vscode-button>
      </div>
      
      <div class="flex justify-end gap-2 mt-2">
        <vscode-button @click="$emit('updateCLI')">
          Update
        </vscode-button>
        <vscode-button appearance="secondary" @click="$emit('infoClose')">
          Later
        </vscode-button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  const props = defineProps<{
    message: string;
  }>();
  </script>
  
  <style scoped>
  .info-banner {
    background-color: var(--vscode-editorWidget-background);
    border-color: var(--vscode-editorWidget-border);
    color: var(--vscode-editor-foreground);
  }
  
  .codicon-info {
    color: var(--vscode-editorInfo-foreground);
    font-size: 16px;
  }
  
  .codicon-close {
    font-size: 14px;
  }
  
  vscode-button[appearance="icon"]::part(control) {
    padding: 2px;
    height: 20px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  </style>