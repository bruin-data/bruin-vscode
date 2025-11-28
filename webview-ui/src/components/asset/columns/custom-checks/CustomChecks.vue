<template>
  <div class="flex flex-col py-2 sm:py-1 h-full w-56 relative">
    <div class="flex justify-end mb-4">
      <vscode-button id="add-custom-check-button" :disabled="isConfigFile" @click="addCustomCheck" class="py-1 focus:outline-none disabled:cursor-not-allowed">
        Add Check
      </vscode-button>
    </div>
    <table id="custom-checks-table" class="min-w-full border-collapse border-editor-fg">
      <thead>
        <tr class="border-opacity-test text-xs font-semibold text-left opacity-65 border-b-2">
          <th class="px-2 py-1 w-1/4">Name</th>
          <th class="px-2 py-1 w-1/6 text-center">Check</th>
          <th class="px-2 py-1 w-1/2">Query</th>
          <th class="px-2 py-1 w-1/4"></th>
        </tr>
      </thead>
      <tbody v-if="localCustomChecks.length">
        <tr
          v-for="(check, index) in localCustomChecks"
          :key="index"
          :id="`custom-check-row-${index}`"
          class="border-b border-commandCenter-border"
        >
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/4">
            <div class="break-words whitespace-normal">
              <div class="break-words" :title="check.name">
                {{ check.name }}
              </div>
              <div 
                v-if="check.description"
                class="text-xs opacity-60 mt-1 break-words"
                :title="check.description"
              >
                {{ check.description }}
              </div>
              <div v-else class="text-xs opacity-60 mt-1 italic">
                No description provided
              </div>
            </div>
          </td>
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/6 text-center">
            <div class="flex flex-col gap-1">
              <div v-if="check.count !== null && check.count !== undefined" class="truncate" :title="String(check.count)">
                count: {{ check.count }}
              </div>
              <div v-else-if="check.value !== null && check.value !== undefined" class="truncate" :title="String(check.value)">
                val: {{ check.value }}
              </div>
            </div>
          </td>
          <td class="px-2 py-1 text-xs w-1/2">
            <div
              v-html="highlightedLines(check.query)"
              class="break-words whitespace-pre-wrap font-mono text-xs"
              :title="check.query"
            ></div>
          </td>
          <td class="px-2 py-1 text-xs w-1/4">
            <div class="flex items-center gap-1">
              <vscode-button
                :id="`custom-check-delete-button-${index}`"
                appearance="icon"
                @click="showDeleteAlert = index"
                aria-label="Delete"
                class="flex items-center"
              >
                <TrashIcon class="h-3 w-3" />
              </vscode-button>
              <vscode-button
                :id="`custom-check-edit-button-${index}`"
                appearance="icon"
                @click="startEditing(index)"
                aria-label="Edit"
                class="flex items-center"
              >
                <PencilIcon class="h-3 w-3" />
              </vscode-button>
            </div>
          </td>
          <div>
            <DeleteAlert
              v-if="showDeleteAlert === index"
              :id="`custom-check-delete-alert-${index}`"
              title="Delete Custom Check"
              :message="`Are you sure you want to delete the custom check ${check.name}? This action cannot be undone.`"
              @confirm="deleteCustomCheck(index)"
              confirm-text="Delete"
              @cancel="showDeleteAlert = null"
              class="absolute z-50"
            />
          </div>
        </tr>
      </tbody>
      <div id="custom-checks-empty-state" class="w-56 text-left p-2 text-md italic opacity-70" v-else>
        <span> No custom checks to display. </span>
      </div>
    </table>
    
    <!-- Edit Card Overlay -->
    <div v-if="editingIndex !== null" class="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50">
      <div class="bg-editorWidget-bg border border-commandCenter-border rounded p-4 w-full max-w-xl max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-editor-fg">
            {{ isNewCheck ? 'Add Custom Check' : 'Edit Custom Check' }}
          </h3>
          <vscode-button
            appearance="icon"
            @click="resetEditing"
            aria-label="Close"
            class="flex items-center"
          >
            <XMarkIcon class="h-4 w-4" />
          </vscode-button>
        </div>
        
        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-editor-fg mb-2">Name</label>
            <textarea
              :id="`custom-check-name-input-${editingIndex}`"
              v-model="(editingCustomCheck as CustomChecks).name"
              class="w-full p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm"
              :class="{ 'border-red-500': isDuplicateName }"
              rows="2"
              placeholder="Enter check name"
            ></textarea>
            <div v-if="isDuplicateName" class="text-xs text-red-500 mt-1">
              A check with this name already exists.
            </div>
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-editor-fg mb-2">Description</label>
            <textarea
              :id="`custom-check-description-input-${editingIndex}`"
              v-model="(editingCustomCheck as CustomChecks).description"
              class="w-full p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm"
              rows="3"
              placeholder="Enter check description"
            ></textarea>
          </div>
          
          <!-- Check Type (Value/Count) -->
          <div>
            <label class="block text-sm font-medium text-editor-fg mb-2">Check Type</label>
            <div class="flex gap-4 mb-3">
              <vscode-radio-group 
                :value="checkType" 
                @change="(e: any) => handleCheckTypeChange(e.target.value)"
              >
                <vscode-radio
                  :id="`check-type-value`"
                  value="value"
                >
                  Value
                </vscode-radio>
                <vscode-radio
                  :id="`check-type-count`"
                  value="count"
                >
                  Count
                </vscode-radio>
              </vscode-radio-group>
            </div>
            
            <!-- Value/Count Input -->
            <div>
              <label class="block text-sm font-medium text-editor-fg mb-2">
                {{ checkType === 'value' ? 'Value' : 'Count' }}
              </label>
              <input
                :id="`custom-check-${checkType}-input-${editingIndex}`"
                :value="getCurrentValue()"
                @input="updateCheckValue"
                type="text"
                class="w-full p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm"
                :placeholder="`Enter ${checkType}`"
              />
            </div>
          </div>
          
          <!-- Query -->
          <div>
            <label class="block text-sm font-medium text-editor-fg mb-2">Query</label>
            <textarea
              :id="`custom-check-query-input-${editingIndex}`"
              v-model="(editingCustomCheck as CustomChecks).query"
              class="w-full p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm font-mono"
              rows="6"
              placeholder="Enter SQL query"
            ></textarea>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 mt-6">
          <vscode-button
            @click="resetEditing"
          >
            Cancel
          </vscode-button>
          <vscode-button
            @click="saveCustomChecks"
            :disabled="isSaveDisabled"
            :class="{ 'opacity-50 cursor-not-allowed': isSaveDisabled }"
          >
            {{ isNewCheck ? 'Add Check' : 'Save Changes' }}
          </vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CustomChecks } from "@/types";
import "highlight.js/styles/default.css";
import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import { ref, watch, computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import { vscode } from "@/utilities/vscode";
import { CheckIcon, TrashIcon, PencilIcon, XMarkIcon } from "@heroicons/vue/24/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";

// Register SQL language for syntax highlighting
hljs.registerLanguage('sql', sql);

const props = defineProps<{
  customChecks: CustomChecks[];
  isConfigFile: boolean;
}>();

const localCustomChecks = ref<CustomChecks[]>([]);
const editingIndex = ref<number | null>(null);
const editingCustomCheck = ref<CustomChecks | null>(null);
const checkType = ref<'value' | 'count'>('value');

const showDeleteAlert = ref<number | null>(null);
const isNewCheck = ref<boolean>(false);


// Computed property to check for duplicate names
const isDuplicateName = computed(() => {
  if (!editingCustomCheck.value || !editingCustomCheck.value.name) return false;
  
  const currentName = editingCustomCheck.value.name.trim().toLowerCase();
  return localCustomChecks.value.some((check, index) => 
    index !== editingIndex.value && 
    check.name.trim().toLowerCase() === currentName
  );
});

// Computed property to determine if save should be disabled
const isSaveDisabled = computed(() => {
  return isDuplicateName.value || !editingCustomCheck.value?.name?.trim();
});


const getCurrentValue = () => {
  if (!editingCustomCheck.value) return '';
  
  if (checkType.value === 'value') {
    return editingCustomCheck.value.value?.toString() || '';
  } else {
    return editingCustomCheck.value.count?.toString() || '';
  }
};

const updateCheckValue = (event: Event) => {
  if (!editingCustomCheck.value) return;
  
  const target = event.target as HTMLInputElement;
  const value = target.value.trim() === '' ? null : Number(target.value);
  
  if (checkType.value === 'value') {
    editingCustomCheck.value.value = value;
    editingCustomCheck.value.count = null;
  } else {
    editingCustomCheck.value.count = value;
    editingCustomCheck.value.value = null;
  }
};

const handleCheckTypeChange = (newType: 'value' | 'count') => {
  checkType.value = newType;
  
  if (!editingCustomCheck.value) return;
  
  if (newType === 'value') {
    editingCustomCheck.value.count = null;
  } else {
    editingCustomCheck.value.value = null;
  }
};

const addCustomCheck = () => {
  try {
    const newCustomCheck = {
      id: uuidv4(),
      name: "New Custom Check",
      description: "Description for the new custom check",
      query: "",
      value: null,
      count: null,
    };

    localCustomChecks.value.push(newCustomCheck);
    editingIndex.value = localCustomChecks.value.length - 1;
    editingCustomCheck.value = JSON.parse(JSON.stringify(newCustomCheck)) as CustomChecks;
    isNewCheck.value = true;
    checkType.value = 'value';
  } catch (error) {
    console.error("Error adding new custom check:", error);
  }
};

const startEditing = (index: number) => {
  editingIndex.value = index;
  editingCustomCheck.value = JSON.parse(
    JSON.stringify(localCustomChecks.value[index])
  ) as CustomChecks;
  isNewCheck.value = false;
  
  const hasCount = editingCustomCheck.value.count !== null && editingCustomCheck.value.count !== undefined;
  const hasValue = editingCustomCheck.value.value !== null && editingCustomCheck.value.value !== undefined;
  
  if (hasCount) {
    checkType.value = 'count';
    editingCustomCheck.value.value = null;
  } else if (hasValue) {
    checkType.value = 'value';
    editingCustomCheck.value.count = null;
  } else {
    checkType.value = 'value';
    editingCustomCheck.value.value = null;
    editingCustomCheck.value.count = null;
  }
};

const resetEditing = () => {
  if (isNewCheck.value && editingIndex.value !== null) {
    localCustomChecks.value.splice(editingIndex.value, 1);
  }
  
  editingIndex.value = null;
  editingCustomCheck.value = null;
  isNewCheck.value = false;
};

const deleteCustomCheck = (index: number) => {
  try {
    localCustomChecks.value.splice(index, 1);
    showDeleteAlert.value = null;
    saveCustomChecks();
  } catch (error) {
    console.error("Error deleting custom check:", error);
  }
};

const saveCustomChecks = () => {
  try {
    if (editingIndex.value !== null && editingCustomCheck.value) {
      if (isSaveDisabled.value) {
        return;
      }

      const updatedCheck: any = {
        id: editingCustomCheck.value.id,
        name: editingCustomCheck.value.name.trim(),
        description: editingCustomCheck.value.description || '',
        query: editingCustomCheck.value.query || '',
      };

      if (editingCustomCheck.value.blocking !== undefined) {
        updatedCheck.blocking = editingCustomCheck.value.blocking;
      }

      if (checkType.value === 'value' && editingCustomCheck.value.value !== null && editingCustomCheck.value.value !== undefined) {
        updatedCheck.value = Number(editingCustomCheck.value.value);
      } else if (checkType.value === 'count' && editingCustomCheck.value.count !== null && editingCustomCheck.value.count !== undefined) {
        updatedCheck.count = Number(editingCustomCheck.value.count);
      }

      localCustomChecks.value[editingIndex.value] = updatedCheck;
    }

    editingIndex.value = null;
    editingCustomCheck.value = null;
    isNewCheck.value = false;

    const formattedCustomChecks = localCustomChecks.value.map((check) => {
      const formattedCheck: any = {
        id: String(check.id),
        name: String(check.name),
        description: String(check.description || ''),
        query: String(check.query || ''),
      };

      // Include blocking property if it exists
      if (check.blocking !== undefined) {
        formattedCheck.blocking = Boolean(check.blocking);
      }

      // Include value OR count (but not both) - allow zero values
      const hasCount = check.count !== null && check.count !== undefined;
      const hasValue = check.value !== null && check.value !== undefined;
      
      if (hasCount) {
        formattedCheck.count = Number(check.count);
      } else if (hasValue) {
        formattedCheck.value = Number(check.value);
      }

      return formattedCheck;
    });

    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: { custom_checks: formattedCustomChecks },
      source: "saveCustomChecks",
    });

  } catch (error) {
    console.error("Error saving custom checks:", error);
  }
};
const highlightedLines = (query: string) => {
  if (!query) return ""; 
  const highlighted = hljs.highlight(query, { language: "sql" }).value;

  let lines = highlighted.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line) => `<div>${line}</div>`).join(""); 
};

watch(
  () => props.customChecks,
  (newCustomChecks) => {
    editingIndex.value = null;
    editingCustomCheck.value = null;
    showDeleteAlert.value = null;
    isNewCheck.value = false;
    localCustomChecks.value = newCustomChecks.map((check) => ({
      ...check,
    }));
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
table thead tr.border-opacity-test {
  border: 0.7 !important; 
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

input,
textarea {
  @apply text-xs bg-input-background text-input-foreground border-none outline-none p-1;
}

input:focus,
textarea:focus {
  outline: none;
}
</style>
