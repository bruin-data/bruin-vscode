<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[99998] bg-editor-bg opacity-50"
    @click="$emit('close')"
  ></div>

  <!-- Asset Variables Panel -->
  <div
    v-if="isOpen"
    class="fixed z-[999999] w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] bg-editorWidget-bg border border-commandCenter-border variables-panel flex flex-col"
    :style="panelStyle"
    @mousedown.stop
  >
    <!-- Header -->
    <div class="p-2 border-b border-commandCenter-border flex-shrink-0">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-medium text-editor-fg">Variable Overrides</h4>
        <vscode-button
          appearance="icon"
          class="h-5 w-5 p-0 opacity-70 hover:opacity-100"
          title="Close"
          @click="$emit('close')"
        >
          <span class="codicon codicon-close text-[10px]"></span>
        </vscode-button>
      </div>
      <p class="text-2xs text-editor-fg opacity-70 mt-1">
        Override pipeline defaults for testing
      </p>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      <!-- Variables List with Override Inputs -->
      <div v-if="variables && Object.keys(variables).length > 0" class="space-y-2">
        <div
          v-for="(variable, varName) in variables"
          :key="varName"
          class="p-2 bg-editor-bg rounded border border-commandCenter-border space-y-2"
        >
          <!-- Variable Info -->
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-editor-fg font-medium">{{ varName }}</span>
              <span class="text-2xs px-1.5 py-0.5 bg-button-bg text-button-fg rounded">
                {{ variable.type }}
              </span>
            </div>
            <div v-if="variable.description" class="text-2xs text-editor-fg opacity-70 mb-1">
              {{ variable.description }}
            </div>
            <div class="text-2xs text-editor-fg opacity-60">
              Default: <span class="font-mono">{{ formatDisplayValue(variable.default) }}</span>
            </div>
          </div>

          <!-- Override Input -->
          <div class="pt-2 border-t border-commandCenter-border">
            <label class="block text-2xs text-editor-fg mb-1">
              Override Value
            </label>
            <div class="flex gap-1 items-center">
              <input
                :value="getOverrideValue(varName)"
                type="text"
                :placeholder="`Default: ${formatDisplayValue(variable.default)}`"
                class="flex-1 bg-editorWidget-bg text-editor-fg text-2xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                @input="handleOverrideInput(String(varName), variable, ($event.target as HTMLInputElement).value)"
              />
              <vscode-button
                v-if="hasOverride(varName)"
                appearance="icon"
                class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                title="Clear override"
                @click="clearOverride(String(varName))"
              >
                <span class="codicon codicon-clear-all text-[10px]"></span>
              </vscode-button>
            </div>
            <div v-if="hasOverride(varName)" class="text-2xs text-editor-fg opacity-70 mt-1 flex items-center gap-1">
              <span class="codicon codicon-info text-[10px]"></span>
              <span>Using override: <span class="font-mono">{{ formatDisplayValue(getOverrideValue(varName)) }}</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- No variables state -->
      <div v-else class="text-center py-4">
        <div class="text-2xs text-editor-fg opacity-60 mb-2">No pipeline variables found</div>
      </div>
    </div>

    <!-- Footer with Save Button -->
    <div class="p-2 border-t border-commandCenter-border flex-shrink-0">
      <div class="flex justify-end gap-2">
        <vscode-button
          appearance="secondary"
          class="text-2xs h-6 px-3"
          @click="handleSave"
          :disabled="Object.keys(variableOverrides).length === 0"
        >
          Save Overrides
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";

interface Variable {
  type: string;
  default: any;
  description?: string;
}

interface Props {
  isOpen: boolean;
  variables: Record<string, Variable>;
  triggerElementId: string;
  initialOverrides?: Record<string, any>;
  initialApplyOverrides?: boolean;
}

interface Emits {
  (e: "close"): void;
  (e: "render-with-overrides", overrides: Record<string, any>): void;
  (e: "save-overrides", overrides: Record<string, any>, applyOverrides: boolean): void;
  (e: "apply-overrides-toggle", applyOverrides: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Runtime variable overrides
const variableOverrides = ref<Record<string, any>>({});

// Initialize from props
watch(() => props.initialOverrides, (val) => {
  if (val) {
    variableOverrides.value = { ...val };
  }
}, { immediate: true });


// Panel positioning
const panelStyle = ref<Record<string, string>>({});

function updatePanelPosition() {
  try {
    const el = document.getElementById(props.triggerElementId);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const panelWidth = 320;
    const panelHeight = 400;
    const margin = 8;
    
    let top = rect.bottom + margin;
    let left = rect.left;
    
    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - panelWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }
    
    const maxTop = window.innerHeight - panelHeight - margin;
    if (top > maxTop) {
      const topAbove = rect.top - panelHeight - margin;
      if (topAbove >= margin) {
        top = topAbove;
      } else {
        top = Math.max(margin, maxTop);
      }
    }
    
    panelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
    };
  } catch (_) {}
}

function onWindowResize() {
  if (props.isOpen) {
    updatePanelPosition();
  }
}

function onWindowClick(e: MouseEvent) {
  if (props.isOpen) {
    const triggerButton = document.getElementById(props.triggerElementId);
    const panel = document.querySelector(".variables-panel");
    if (triggerButton && !triggerButton.contains(e.target as Node) && 
        panel && !panel.contains(e.target as Node)) {
      emit("close");
    }
  }
}

function onWindowBlur() {
  if (props.isOpen) {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("click", onWindowClick, true);
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("blur", onWindowBlur);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick, true);
  window.removeEventListener("resize", onWindowResize);
  window.removeEventListener("blur", onWindowBlur);
});

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    updatePanelPosition();
  }
});

function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatVariableValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

// Simplified override functions
function getOverrideValue(varName: string): string {
  const override = variableOverrides.value[varName];
  if (override === undefined || override === null) return "";
  return formatVariableValue(override);
}

function hasOverride(varName: string): boolean {
  return variableOverrides.value[varName] !== undefined && variableOverrides.value[varName] !== null;
}

function parseValueByType(value: string, type: string): any {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    switch (type) {
      case "boolean":
        return trimmed.toLowerCase() === "true";
      case "integer":
        const intVal = parseInt(trimmed);
        return isNaN(intVal) ? null : intVal;
      case "number":
        const numVal = parseFloat(trimmed);
        return isNaN(numVal) ? null : numVal;
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
    return; // Invalid value, don't update
  }

  variableOverrides.value[varName] = parsedValue;
  emit("render-with-overrides", { ...variableOverrides.value });
}

function clearOverride(varName: string): void {
  delete variableOverrides.value[varName];
  emit("render-with-overrides", { ...variableOverrides.value });
}


function handleSave() {
  emit("save-overrides", { ...variableOverrides.value }, true);
  emit("close");
}
</script>
