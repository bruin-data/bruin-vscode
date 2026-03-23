<template>
  <div v-if="isOpen" class="mt-2 flex flex-col">
    <!-- Header row -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-editor-fg font-medium">Configure Backfill</span>
      <button @click="$emit('close')" class="text-editor-fg opacity-50 hover:opacity-100" title="Close">
        <span class="codicon codicon-close text-xs"></span>
      </button>
    </div>

    <!-- Configuration form -->
    <div class="border border-commandCenter-border rounded bg-sideBar-bg overflow-hidden">
      <div class="p-2 space-y-3">
        <!-- Date Range -->
        <div class="flex flex-col xs:flex-row gap-2">
          <DateInput label="Backfill Start" v-model="config.startDate" />
          <DateInput label="Backfill End" v-model="config.endDate" />
        </div>

        <!-- Interval Configuration -->
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="text-xs text-editor-fg mb-1 block opacity-70">Interval Size</label>
            <input
              v-model.number="config.intervalSize"
              type="number"
              min="1"
              class="w-full px-2 py-1 text-xs bg-dropdown-bg text-editor-fg border border-commandCenter-border rounded focus:outline-none"
            />
          </div>
          <div class="flex-1">
            <label class="text-xs text-editor-fg mb-1 block opacity-70">Interval Unit</label>
            <select
              v-model="config.intervalUnit"
              class="w-full px-2 py-1 text-xs bg-dropdown-bg text-editor-fg border border-commandCenter-border rounded focus:outline-none"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        <!-- Preview info -->
        <div class="text-2xs text-editor-fg opacity-60">
          <span v-if="estimatedJobs > 0">
            This will run <span class="font-medium text-editor-fg opacity-90">{{ estimatedJobs }}</span> sequential jobs in the terminal
          </span>
          <span v-else-if="!isValid" class="text-editorError-foreground">
            {{ validationError }}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end px-2 py-1.5 bg-editorWidget-bg border-t border-commandCenter-border">
        <vscode-button @click="startBackfill" :disabled="!isValid || estimatedJobs === 0" class="text-xs h-6">
          <div class="flex items-center justify-center">
            <span class="codicon codicon-play mr-1"></span>
            <span>Start Backfill</span>
          </div>
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { vscode } from '@/utilities/vscode';
import DateInput from '@/components/ui/date-inputs/DateInput.vue';

type IntervalUnit = 'hour' | 'day' | 'week' | 'month' | 'year';

interface BackfillConfig {
  startDate: string;
  endDate: string;
  intervalUnit: IntervalUnit;
  intervalSize: number;
}

const props = defineProps<{
  isOpen: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  environment?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Initialize dates to yesterday and today
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const config = ref<BackfillConfig>({
  startDate: props.initialStartDate || yesterday.toISOString(),
  endDate: props.initialEndDate || today.toISOString(),
  intervalUnit: 'day',
  intervalSize: 1,
});

const validationError = computed(() => {
  if (!config.value.startDate || !config.value.endDate) {
    return 'Please select start and end dates';
  }
  const start = new Date(config.value.startDate);
  const end = new Date(config.value.endDate);
  if (start >= end) {
    return 'End date must be after start date';
  }
  if (config.value.intervalSize < 1) {
    return 'Interval size must be at least 1';
  }
  return '';
});

const isValid = computed(() => validationError.value === '');

const estimatedJobs = computed(() => {
  if (!isValid.value) return 0;

  const start = new Date(config.value.startDate);
  const end = new Date(config.value.endDate);
  const diffMs = end.getTime() - start.getTime();

  const unitMs: Record<IntervalUnit, number> = {
    hour: 3600000,
    day: 86400000,
    week: 604800000,
    month: 2592000000,
    year: 31536000000,
  };

  const intervalMs = unitMs[config.value.intervalUnit] * config.value.intervalSize;
  return Math.ceil(diffMs / intervalMs);
});

const startBackfill = () => {
  if (!isValid.value) return;

  vscode.postMessage({
    command: 'bruin.startBackfill',
    payload: {
      startDate: config.value.startDate,
      endDate: config.value.endDate,
      intervalUnit: config.value.intervalUnit,
      intervalSize: config.value.intervalSize,
      environment: props.environment || '',
    },
  });

  // Close the dialog - backfill will run in terminal
  emit('close');
};

// Update config when props change
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      if (props.initialStartDate) {
        config.value.startDate = props.initialStartDate;
      }
      if (props.initialEndDate) {
        config.value.endDate = props.initialEndDate;
      }
    }
  }
);
</script>

<style scoped>
vscode-button::part(control) {
  @apply border-none pl-1.5;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.25rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 1.75rem;
}
</style>
