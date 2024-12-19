import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';

<template>
  <div 
    v-if="status" 
    class="fixed bottom-4 right-4 max-w-md p-4 border transition-all duration-300 transform"
    :class="statusClasses"
  >
    <div class="flex items-center space-x-3">
      <CheckCircleIcon v-if="status === 'success'" class="h-6 w-6 text-green-500" />
      <XCircleIcon v-if="status === 'failure'" class="h-6 w-6 text-red-500" />
      
      <div class="flex-1">
        <p class="text-sm font-medium" :class="textColorClass">
          {{ message }}
        </p>
      </div>

      <button 
        @click="dismiss" 
        class="text-editor-fg opacity-70 hover:opacity-100"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';
const props = defineProps({
  status: {
    type: String,
    validator: (value) => ['success', 'failure', null].includes(value),
    required: true
  },
  // Optional custom messages
  successMessage: {
    type: String,
    default: 'Connection test successful'
  },
  failureMessage: {
    type: String,
    default: 'Connection test failed'
  },
  // Auto-dismiss duration in milliseconds (0 to disable)
  autoDismiss: {
    type: Number,
    default: 5000
  }
});

const emit = defineEmits(['dismiss']);

// Computed classes based on status
const statusClasses = computed(() => ({
  'bg-editorWidget-bg border-green-500': props.status === 'success',
  'bg-editorWidget-bg border-red-500': props.status === 'failure',
}));

const textColorClass = computed(() => ({
  'text-green-500': props.status === 'success',
  'text-red-500': props.status === 'failure',
  'text-editor-fg': !props.status
}));

// Computed message based on status
const message = computed(() => {
  switch (props.status) {
    case 'success':
      return props.successMessage;
    case 'failure':
      return props.failureMessage;
    default:
      return '';
  }
});

// Auto-dismiss functionality
let dismissTimer = null;

const dismiss = () => {
  emit('dismiss');
};

// Watch for status changes to handle auto-dismiss
watch(() => props.status, (newStatus) => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }
  
  if (newStatus && props.autoDismiss > 0) {
    dismissTimer = setTimeout(() => {
      dismiss();
    }, props.autoDismiss);
  }
});

// Clean up timer on component unmount
onUnmounted(() => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }
});
</script>