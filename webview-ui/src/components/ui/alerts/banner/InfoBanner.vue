<template>
    <div class="floating-banner-container">
      <div class="floating-info-banner rounded shadow-md border w-full flex flex-col">
        <div class="flex justify-between items-start w-full">
          <div class="flex items-center gap-2 min-w-0 flex-grow">
            <span class="codicon codicon-info flex-shrink-0"></span>
            <div class="flex flex-col min-w-0">
              <p class="text-xs m-0 truncate">{{ props.message }}</p>
            </div>
          </div>
          <vscode-button appearance="icon" @click="$emit('infoClose')" title="Close" class="flex-shrink-0 ml-2">
            <span class="codicon codicon-close"></span>
          </vscode-button>
        </div>
        
        <div class="flex justify-end gap-2 mt-2">
          <vscode-button @click="$emit('updateCLI')" class="flex-shrink-0">
            Update Now
          </vscode-button>
          <vscode-button appearance="secondary" @click="$emit('infoClose')" class="flex-shrink-0">
            Later
          </vscode-button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  const props = defineProps<{
    message: string;
  }>();
  </script>
  
  <style scoped>
  .floating-banner-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    padding: 8px;
    pointer-events: none; /* Allow clicks to pass through the container */
    display: flex;
    justify-content: center;
  }
  
  .floating-info-banner {
    background-color: var(--vscode-notifications-background);
    border-color: var(--vscode-notifications-border, var(--vscode-editorWidget-border));
    color: var(--vscode-notifications-foreground, var(--vscode-editor-foreground));
    box-sizing: border-box;
    max-width: 450px;
    min-width: 300px;
    padding: 10px;
    pointer-events: auto; /* Re-enable pointer events for the actual banner */
    animation: slideDown 0.3s ease-out forwards;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .codicon-info {
    color: var(--vscode-notificationsInfoIcon-foreground, var(--vscode-editorInfo-foreground));
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
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  /* Media query for smaller screens */
  @media (max-width: 500px) {
    .floating-info-banner {
      max-width: calc(100% - 16px);
      min-width: auto;
    }
  }
  </style>