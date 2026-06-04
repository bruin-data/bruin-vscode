<template>
  <div
    v-if="isOpen"
    id="asset-variables-panel"
    class="mt-2 w-full bg-editorWidget-bg border border-commandCenter-border rounded"
  >
    <!-- Header -->
    <div class="px-2 py-1.5 border-b border-commandCenter-border flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="text-xs font-medium text-editor-fg">Variable overrides</h4>
        <span class="text-2xs text-editor-fg opacity-60">
          {{ activeOverrideCount }} / {{ variableCount }} active
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="activeOverrideCount > 0"
          type="button"
          id="clear-all-overrides"
          class="text-2xs text-editor-fg opacity-70 hover:opacity-100 px-2 py-0.5"
          title="Clear all overrides"
          @click="clearAllOverrides"
        >
          Clear all
        </button>
      </div>
    </div>

    <!-- Variables List -->
    <div class="px-2 py-2 max-h-[320px] overflow-y-auto">
      <div v-if="variableCount > 0" class="space-y-1">
        <div
          v-for="(variable, varName) in variables"
          :key="varName"
          class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)_auto] items-center gap-2 py-1 border-b border-commandCenter-border last:border-b-0"
        >
          <!-- Name + type -->
          <div class="flex items-center gap-1 min-w-0">
            <span
              class="text-xs font-mono text-editor-fg truncate"
              :title="variable.description || String(varName)"
            >{{ varName }}</span>
            <span class="text-2xs px-1 py-0.5 bg-button-bg text-button-fg rounded shrink-0">
              {{ variable.type }}
            </span>
          </div>

          <!-- Default value (compact) -->
          <div class="text-2xs text-editor-fg opacity-60 font-mono whitespace-nowrap">
            default: {{ formatDisplayValue(variable.default) }}
          </div>

          <!-- Override input -->
          <div class="flex items-center gap-1 min-w-0">
            <input
              :value="getOverrideValue(String(varName))"
              type="text"
              placeholder="Override value"
              :class="[
                'flex-1 bg-editorWidget-bg text-editor-fg text-2xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6',
                hasOverride(String(varName))
                  ? 'border-editorLink-activeFg'
                  : 'border-commandCenter-border',
              ]"
              @input="handleOverrideInput(String(varName), variable, ($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- Clear single -->
          <button
            v-if="hasOverride(String(varName))"
            type="button"
            class="text-descriptionFg opacity-70 hover:opacity-100 h-5 w-5 inline-flex items-center justify-center"
            title="Clear override"
            @click="clearOverride(String(varName))"
          >
            <span class="codicon codicon-close text-[10px]"></span>
          </button>
          <span v-else aria-hidden="true" class="w-5"></span>
        </div>
      </div>

      <!-- No variables state -->
      <div v-else class="text-center py-3">
        <div class="text-2xs text-editor-fg opacity-60 italic">
          No pipeline variables found. Define variables in
          <span class="font-mono">pipeline.yml</span> to override them here.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface Variable {
  type: string;
  default: any;
  description?: string;
}

interface Props {
  isOpen: boolean;
  variables: Record<string, Variable>;
  initialOverrides?: Record<string, any>;
}

interface Emits {
  (e: "render-with-overrides", overrides: Record<string, any>): void;
  (e: "apply-overrides-toggle", applyOverrides: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Local mirror of overrides, kept in sync with parent via initialOverrides.
const variableOverrides = ref<Record<string, any>>({});

watch(
  () => props.initialOverrides,
  (val) => {
    variableOverrides.value = { ...(val || {}) };
  },
  { immediate: true },
);

const variableCount = computed(() => Object.keys(props.variables || {}).length);

const activeOverrideCount = computed(() => {
  const overrides = variableOverrides.value || {};
  const declared = Object.keys(props.variables || {});
  return declared.filter((k) => {
    const v = overrides[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
});

function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatVariableValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getOverrideValue(varName: string): string {
  const override = variableOverrides.value[varName];
  if (override === undefined || override === null) return "";
  return formatVariableValue(override);
}

function hasOverride(varName: string): boolean {
  const v = variableOverrides.value[varName];
  return v !== undefined && v !== null && v !== "";
}

function parseValueByType(value: string, type: string): any {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    switch (type) {
      case "boolean":
        return trimmed.toLowerCase() === "true";
      case "integer": {
        const intVal = parseInt(trimmed);
        return isNaN(intVal) ? null : intVal;
      }
      case "number": {
        const numVal = parseFloat(trimmed);
        return isNaN(numVal) ? null : numVal;
      }
      case "array":
      case "object":
        return JSON.parse(trimmed);
      default:
        return trimmed;
    }
  } catch {
    return null;
  }
}

function handleOverrideInput(varName: string, variable: Variable, value: string) {
  if (!value.trim()) {
    clearOverride(varName);
    return;
  }

  const parsedValue = parseValueByType(value, variable.type);
  if (parsedValue === null) {
    return; // Invalid value, don't update.
  }

  const wasEmpty = activeOverrideCount.value === 0;
  variableOverrides.value = { ...variableOverrides.value, [varName]: parsedValue };
  emit("render-with-overrides", { ...variableOverrides.value });

  // First override entered — auto-enable the "apply overrides" toggle so users
  // don't set a value but forget to apply it on the next run.
  if (wasEmpty) {
    emit("apply-overrides-toggle", true);
  }
}

function clearOverride(varName: string): void {
  const next = { ...variableOverrides.value };
  delete next[varName];
  variableOverrides.value = next;
  emit("render-with-overrides", { ...variableOverrides.value });

  // No overrides left — turn off the apply toggle.
  if (activeOverrideCount.value === 0) {
    emit("apply-overrides-toggle", false);
  }
}

function clearAllOverrides(): void {
  variableOverrides.value = {};
  emit("render-with-overrides", {});
  emit("apply-overrides-toggle", false);
}
</script>
