
<script setup lang="ts">
import { computed } from 'vue';
import { MessageCircleWarningIcon } from 'lucide-vue-next'

const props = defineProps(['errorMessage']);

const errorStyle = computed(() => ({
  color: '#c0392b', // Error red with slight variation
  padding: '1rem 1.5rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontWeight: 'bold',
  marginBottom: '1rem',
  backgroundColor: '#f8f9fa', // Light background for contrast
  fontSize: '0.9rem', // Slightly smaller font for readability
}));
</script>

<template>
  <div :style="errorStyle" role="alert" aria-live="assertive">
    <span class="icon">
      <MessageCircleWarningIcon color="red" :size="16"/>
    </span>
    <span class="message">{{ props.errorMessage }}</span>
  </div>
</template>

<style scoped>
.icon {
  margin-right: 0.5rem;
  vertical-align: middle;
}
</style>