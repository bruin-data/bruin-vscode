<template>
  <div id="alert-with-actions" class="fixed inset-0 flex items-center justify-center bg-editor-bg bg-opacity-75">
    <div class="bg-editorWidget-bg rounded-lg p-6">
      <h3 v-if="title" class="text-lg font-medium text-editor-fg">{{ title }}</h3>
      <p class="mt-2 text-sm text-descriptionFg">
          {{ message }}
      </p>
      <div class="mt-4 flex justify-end">
        <button
          appearance="secondary"
          @click="$emit('cancel')"
          class="mr-3 bg-editor-fg px-4 py-1 rounded hover:text-editor-fg hover:bg-inputOption-hoverBackground text-editor-bg"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          class="bg-errorForeground hover:bg-editorError-foreground hover:text-editor-fg px-4 py-1 rounded text-editor-fg"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
defineProps({
  confirmText: String,
  message: String,
  title: String,  
});
</script>
