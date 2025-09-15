import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';

<template>
  <div
    v-if="status"
    id="connection-test-status"
    class="fixed bottom-4 right-10 max-w-md p-2 border transition-all duration-300 transform"
    :class="statusClasses"
  >
    <div class="flex items-center space-x-3">
      <template v-if="status == 'loading'">
        <svg
          class="animate-spin h-5 w-5 text-editor-fg"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span class="text-sm font-medium text-editor-fg">Testing connection...</span>
      </template>
      <CheckCircleIcon v-if="status === 'success'" class="h-6 w-6 text-green-500" />
      <XCircleIcon v-if="status === 'failure'" class="h-6 w-6 text-red-500" />
      <ExclamationCircleIcon v-if="status === 'unsupported'" class="h-6 w-6 text-editor-fg" />
      <div class="flex-1">
        <p class="text-sm font-medium" :class="textColorClass">
          {{ message }}
        </p>
      </div>

      <button @click="dismiss" class="text-editor-fg opacity-70 hover:opacity-100">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from "vue";
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from "@heroicons/vue/24/outline";
const props = defineProps({
  status: {
    type: String,
    validator: (value) => ["success", "failure", 'unsupported', null].includes(value),
    required: true,
  },
  // Optional custom messages
  successMessage: {
    type: String,
    default: "Connection test successful",
  },
  supportMessage: {
    type: String,
    default: "Connection test unsupported",
  },
  failureMessage: {
    type: String,
    default: "Connection test failed",
  },
  // Auto-dismiss duration in milliseconds (0 to disable)
  autoDismiss: {
    type: Number,
    default: 5000,
  },
});

const emit = defineEmits(["dismiss"]);

// Computed classes based on status
const statusClasses = computed(() => ({
  "bg-editorWidget-bg border-green-500": props.status === "success",
  "bg-editorWidget-bg border-red-500": props.status === "failure",
  "bg-editorWidget-bg border-editorWidget-fg": props.status === "loading",
  "bg-editorWidget-bg border-editorWidget-fg": props.status === "unsupported",
}));

const textColorClass = computed(() => ({
  "text-green-500": props.status === "success",
  "text-red-500": props.status === "failure",
  "text-editor-fg": !props.status,
}));

// Computed message based on status
const message = computed(() => {
  switch (props.status) {
    case "success":
      return props.successMessage;
    case "failure":
      return props.failureMessage;
    case "unsupported":
      return props.supportMessage;
    default:
      return "";
  }
});

// Auto-dismiss functionality
let dismissTimer = null;

const dismiss = () => {
  emit("dismiss");
};

// Watch for status changes to handle auto-dismiss
watch(
  () => props.status,
  (newStatus) => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
    }

    if (newStatus && props.autoDismiss > 0) {
      dismissTimer = setTimeout(() => {
        dismiss();
      }, props.autoDismiss);
    }
  }
);

// Clean up timer on component unmount
onUnmounted(() => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }
});
</script>
