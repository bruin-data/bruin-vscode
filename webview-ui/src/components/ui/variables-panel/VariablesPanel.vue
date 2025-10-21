<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[99998] bg-editor-bg opacity-50"
    @click="$emit('close')"
  ></div>

  <!-- Variables Panel -->
  <div
    v-if="isOpen"
    class="fixed z-[999999] w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] p-3 bg-editorWidget-bg border border-commandCenter-border rounded-md shadow-lg overflow-y-auto variables-panel"
    :style="panelStyle"
    @mousedown.stop
  >
    <div class="space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-medium text-editor-fg">Pipeline Variables</h4>
        <vscode-button
          v-if="!editingVariable"
          appearance="icon"
          class="h-5 w-5 p-0 opacity-70 hover:opacity-100"
          title="Add variable"
          @click="addVariable"
        >
          <span class="codicon codicon-add text-[10px]"></span>
        </vscode-button>
      </div>

      <!-- Add/Edit Variable Form (inline) -->
      <div
        v-if="editingVariable"
        class="bg-editor-bg rounded border border-commandCenter-border p-2"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-medium text-editor-fg">
              {{ editingVariable === "new" ? "Add Variable" : "Edit Variable" }}
            </h4>
            <vscode-button
              appearance="icon"
              class="h-5 w-5 p-0 opacity-70 hover:opacity-100"
              title="Close"
              @click="cancelEdit"
            >
              <span class="codicon codicon-close text-[9px]"></span>
            </vscode-button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-2xs text-editor-fg mb-1">Name</label>
              <input
                v-model="newVariableName"
                type="text"
                placeholder="e.g., env, users"
                class="w-full bg-editorWidget-bg text-editor-fg text-2xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              />
            </div>

            <div>
              <label class="block text-2xs text-editor-fg mb-1">Type</label>
              <select
                v-model="newVariableType"
                class="w-full bg-editorWidget-bg text-editor-fg text-2xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option value="string">String</option>
                <option value="integer">Integer</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-2xs text-editor-fg mb-1">Default Value</label>
            <input
              v-model="newVariableDefault"
              type="text"
              :placeholder="getDefaultPlaceholder()"
              class="w-full bg-editorWidget-bg text-editor-fg text-2xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
            />
          </div>

          <div>
            <label class="block text-2xs text-editor-fg mb-1">Description (optional)</label>
            <input
              v-model="newVariableDescription"
              type="text"
              placeholder="What is this variable used for?"
              class="w-full bg-editorWidget-bg text-editor-fg text-2xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
            />
          </div>

          <div class="flex justify-end gap-1.5 pt-1.5 border-t border-commandCenter-border">
            <vscode-button appearance="secondary" class="text-2xs h-6 px-2" @click="cancelEdit">
              Cancel
            </vscode-button>
            <vscode-button
              class="text-2xs h-6 px-2"
              @click="saveVariable"
              :disabled="!newVariableName.trim() || !newVariableDefault.trim()"
            >
              {{ editingVariable === "new" ? "Add" : "Save" }}
            </vscode-button>
          </div>
        </div>
      </div>

      <!-- Variables List -->
      <div v-if="variables && Object.keys(variables).length > 0" class="space-y-2">
        <div
          v-for="(variable, varName) in variables"
          :key="varName"
          class="flex items-center justify-between p-2 bg-editor-bg rounded border border-commandCenter-border"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-editor-fg font-medium">{{ varName }}</span>
              <span class="text-2xs px-1.5 py-0.5 bg-button-bg text-button-fg rounded">{{
                variable.type
              }}</span>
            </div>
            <div v-if="variable.description" class="text-2xs text-editor-fg opacity-70 mb-1">
              {{ variable.description }}
            </div>
            <div class="text-2xs text-editor-fg opacity-60">
              Default: <span class="font-mono">{{ formatVariableValue(variable.default) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 ml-2">
            <vscode-button
              appearance="icon"
              class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              title="Edit variable"
              @click="editVariable(String(varName), variable)"
            >
              <span class="codicon codicon-edit text-[10px]"></span>
            </vscode-button>
            <vscode-button
              appearance="icon"
              class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              title="Delete variable"
              @click="$emit('delete-variable', String(varName))"
            >
              <span class="codicon codicon-trash text-[10px]"></span>
            </vscode-button>
          </div>
        </div>
      </div>

      <!-- No variables state -->
      <div v-else-if="!editingVariable" class="text-center py-4">
        <div class="text-2xs text-editor-fg opacity-60 mb-2">No variables configured</div>
        <vscode-button appearance="secondary" class="text-2xs h-6 px-3" @click="addVariable">
          Add Variable
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
  items?: any;
  properties?: any;
}

interface Props {
  isOpen: boolean;
  variables: Record<string, Variable>;
  triggerElementId: string;
}

interface Emits {
  (e: "close"): void;
  (e: "save-variable", variable: { name: string; config: Variable; oldName?: string }): void;
  (e: "delete-variable", name: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const editingVariable = ref<string | null>(null);
const newVariableName = ref("");
const newVariableType = ref("string");
const newVariableDefault = ref("");
const newVariableDescription = ref("");

// Panel positioning
const panelStyle = ref<Record<string, string>>({});

function updatePanelPosition() {
  try {
    const el = document.getElementById(props.triggerElementId);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const panelWidth = 320; // w-80 = 320px
    const panelHeight = 400; // estimated max height
    const margin = 8;
    
    // Calculate optimal position
    let top = rect.bottom + margin;
    let left = rect.left;
    
    // Adjust horizontal position if panel would go off-screen
    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - panelWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }
    
    // Adjust vertical position if panel would go off-screen or conflict with terminal
    const maxTop = window.innerHeight - panelHeight - margin;
    if (top > maxTop) {
      // Try positioning above the button
      const topAbove = rect.top - panelHeight - margin;
      if (topAbove >= margin) {
        top = topAbove;
      } else {
        // Use maximum available space
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

onMounted(() => {
  window.addEventListener("click", onWindowClick, true);
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick, true);
  window.removeEventListener("resize", onWindowResize);
});

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    updatePanelPosition();
  }
});

function addVariable() {
  editingVariable.value = "new";
  newVariableName.value = "";
  newVariableType.value = "string";
  newVariableDefault.value = "";
  newVariableDescription.value = "";
}

function editVariable(varName: string, variable: Variable) {
  editingVariable.value = varName;
  newVariableName.value = varName;
  newVariableType.value = variable.type || "string";
  
  try {
    newVariableDefault.value = formatVariableValue(variable.default);
  } catch (error) {
    console.error("Error formatting variable value:", error);
    newVariableDefault.value = String(variable.default || "");
  }
  
  newVariableDescription.value = variable.description || "";
}

function saveVariable() {
  if (!newVariableName.value.trim() || !newVariableDefault.value.trim()) {
    return;
  }

  const variableName = newVariableName.value.trim();

  // Parse the default value based on type
  let parsedDefault: any = newVariableDefault.value.trim();
  try {
    if (newVariableType.value === "boolean") {
      parsedDefault = newVariableDefault.value.toLowerCase() === "true";
    } else if (newVariableType.value === "integer" || newVariableType.value === "number") {
      parsedDefault =
        newVariableType.value === "integer"
          ? parseInt(newVariableDefault.value)
          : parseFloat(newVariableDefault.value);
    } else if (newVariableType.value === "array" || newVariableType.value === "object") {
      parsedDefault = JSON.parse(newVariableDefault.value);
    }
  } catch (error) {
    console.error("Error parsing default value:", error);
    return;
  }

  const variableConfig: Variable = {
    type: newVariableType.value,
    default: parsedDefault,
  };

  if (newVariableDescription.value.trim()) {
    variableConfig.description = newVariableDescription.value.trim();
  }

  // Add items schema for arrays
  if (newVariableType.value === "array") {
    variableConfig.items = { type: "string" };
  }

  // Add properties schema for objects
  if (newVariableType.value === "object") {
    variableConfig.properties = {};
  }

  const saveEvent: { name: string; config: Variable; oldName?: string } = {
    name: variableName, 
    config: variableConfig
  };
  
  if (editingVariable.value !== "new" && editingVariable.value !== null) {
    saveEvent.oldName = editingVariable.value;
  }
  
  emit("save-variable", saveEvent);

  // Reset form
  editingVariable.value = null;
  newVariableName.value = "";
  newVariableType.value = "string";
  newVariableDefault.value = "";
  newVariableDescription.value = "";
}

function cancelEdit() {
  editingVariable.value = null;
  newVariableName.value = "";
  newVariableType.value = "string";
  newVariableDefault.value = "";
  newVariableDescription.value = "";
}

function formatVariableValue(value: any): string {
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

function getDefaultPlaceholder(): string {
  switch (newVariableType.value) {
    case "string":
      return 'e.g., "dev", "production"';
    case "integer":
      return "e.g., 42, 100";
    case "number":
      return "e.g., 3.14, 2.5";
    case "boolean":
      return "e.g., true, false";
    case "array":
      return 'e.g., ["alice", "bob"], [1, 2, 3]';
    case "object":
      return 'e.g., {"name": "value", "key": 123}';
    default:
      return "Enter default value";
  }
}
</script>