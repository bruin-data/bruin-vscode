<template>
  <div class="fixed top-0 left-0 right-0 z-50 p-3 flex justify-center pointer-events-none">
    <div class="floating-info-banner animate-slideDown" tabindex="0">
      <!-- Header with info icon and close button -->
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <span
              class="codicon codicon-info text-[var(--vscode-notificationsInfoIcon-foreground,var(--vscode-editorInfo-foreground))] text-lg flex-shrink-0"
            ></span>
            <p class="text-sm m-0 font-medium">{{ props.message }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-1.5">
            <span class="text-2xs whitespace-nowrap text-[var(--vscode-editor-foreground)]"
              >Current: <strong>{{ props.currentVersion }}</strong></span
            >
            <span class="2xs:opacity-60 2xs:text-3xs hidden 2xs:inline-block">•</span>
            <span class="text-2xs whitespace-nowrap text-[var(--vscode-editor-foreground)]"
              >Latest: <strong>{{ props.latestVersion }}</strong></span
            >
          </div>
        </div>
        <vscode-button
          appearance="icon"
          @click="$emit('infoClose')"
          title="Close"
          class="flex-shrink-0 self-start"
        >
          <span class="codicon codicon-close text-sm"></span>
        </vscode-button>
      </div>
      <!-- Action buttons -->
      <div class="flex justify-end gap-2 mt-3">
        <vscode-button @click="$emit('updateCLI')"> Update Now </vscode-button>
        <vscode-button appearance="secondary" @click="$emit('infoClose')"> Later </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string;
  currentVersion: string;
  latestVersion: string;
}>();
</script>

<style scoped>
.floating-info-banner {
  background-color: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-editorWidget-border);
  color: var(--vscode-editor-foreground);
  box-sizing: border-box;
  max-width: 450px;
  width: 100%;
  padding: 14px 16px;
  pointer-events: auto;
  animation: slideDown 0.3s ease-out forwards;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-info-banner:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slideDown {
  animation: slideDown 0.3s ease-out forwards;
}
</style>
