<template>
  <div
    v-if="isOpen"
    id="asset-variables-panel"
    class="mt-2 w-full bg-editorWidget-bg border border-commandCenter-border rounded"
  >
    <!-- Header -->
    <div class="px-2 py-1.5 border-b border-commandCenter-border flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <h4 class="text-xs font-medium text-editor-fg truncate">Variable overrides</h4>
        <span class="text-2xs text-editor-fg opacity-60 shrink-0">
          {{ draftActiveCount }} / {{ variableCount }} active
        </span>
        <span
          v-if="isDirty"
          class="text-2xs text-editor-fg opacity-60 shrink-0 italic"
          title="You have unsaved changes"
        >• unsaved</span>
      </div>
      <button
        v-if="draftActiveCount > 0"
        type="button"
        id="clear-all-overrides"
        class="text-2xs text-editor-fg opacity-70 hover:opacity-100 px-2 py-0.5 shrink-0"
        title="Clear every override in the draft"
        @click="clearAll"
      >
        Clear all
      </button>
    </div>

    <!-- Variables List -->
    <div class="px-2 py-2 max-h-[360px] overflow-y-auto space-y-2">
      <template v-if="variableCount > 0">
        <div
          v-for="(variable, varName) in variables"
          :key="varName"
          class="rounded border border-commandCenter-border bg-editor-bg p-2"
        >
          <!-- Row 1: name, type, clear button -->
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span
                class="text-xs font-mono text-editor-fg font-medium truncate"
                :title="variable.description || String(varName)"
              >{{ varName }}</span>
              <span class="text-2xs px-1.5 py-0.5 bg-button-bg text-button-fg rounded shrink-0">
                {{ variable.type }}
              </span>
            </div>
            <button
              v-if="hasDraftOverride(String(varName))"
              type="button"
              class="text-descriptionFg opacity-70 hover:opacity-100 h-5 w-5 inline-flex items-center justify-center shrink-0"
              title="Clear override"
              @click="clearDraftOverride(String(varName))"
            >
              <span class="codicon codicon-close text-[10px]"></span>
            </button>
          </div>

          <!-- Row 2: override input -->
          <input
            :value="draftInputs[String(varName)] ?? ''"
            type="text"
            :placeholder="placeholderFor(variable.type)"
            :class="[
              'w-full bg-editorWidget-bg text-editor-fg text-2xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6 font-mono',
              validationErrors[String(varName)]
                ? 'border-editorError-foreground'
                : hasDraftOverride(String(varName))
                  ? 'border-editorLink-activeFg'
                  : 'border-commandCenter-border',
            ]"
            @input="handleInput(String(varName), variable, ($event.target as HTMLInputElement).value)"
          />

          <!-- Validation error -->
          <div
            v-if="validationErrors[String(varName)]"
            class="text-2xs text-editorError-foreground mt-1 flex items-center gap-1"
          >
            <span class="codicon codicon-error text-[10px]"></span>
            <span>{{ validationErrors[String(varName)] }}</span>
          </div>

          <!-- Row 3: default value (compact, below input so it doesn't squash) -->
          <div
            class="text-2xs text-editor-fg opacity-60 font-mono mt-1 truncate"
            :title="`default: ${formatDisplayValue(variable.default)}`"
          >
            default: {{ formatDisplayValue(variable.default) }}
          </div>
        </div>
      </template>

      <!-- No variables state -->
      <div v-else class="text-center py-3">
        <div class="text-2xs text-editor-fg opacity-60 italic">
          No pipeline variables found. Define variables in
          <span class="font-mono">pipeline.yml</span> to override them here.
        </div>
      </div>
    </div>

    <!-- Footer: Save / Revert -->
    <div
      v-if="variableCount > 0"
      class="px-2 py-1.5 border-t border-commandCenter-border flex items-center justify-end gap-2"
    >
      <button
        v-if="isDirty"
        type="button"
        id="revert-overrides"
        class="text-2xs text-editor-fg opacity-70 hover:opacity-100 px-2 py-0.5"
        title="Discard unsaved changes"
        @click="revert"
      >
        Revert
      </button>
      <button
        type="button"
        id="save-overrides"
        class="text-2xs rounded px-3 py-1 bg-editor-button-bg text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!isDirty || hasValidationErrors"
        :title="saveButtonTooltip"
        @click="save"
      >
        Save
      </button>
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
  (e: "save-overrides", overrides: Record<string, any>, applyOverrides: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Draft state — what's in the inputs right now. Only emitted out on Save.
// `draftInputs` holds raw text per variable (preserves user-typed value even
// when invalid). `draftOverrides` holds parsed values (only present when
// valid). `validationErrors` holds the per-field error message, if any.
const draftInputs = ref<Record<string, string>>({});
const draftOverrides = ref<Record<string, any>>({});
const validationErrors = ref<Record<string, string>>({});

// The last saved state, used to compute `isDirty` and to revert.
const appliedOverrides = ref<Record<string, any>>({});

watch(
  () => props.initialOverrides,
  (val) => {
    appliedOverrides.value = { ...(val || {}) };
    resetDraftFromApplied();
  },
  { immediate: true, deep: true },
);

function resetDraftFromApplied() {
  const inputs: Record<string, string> = {};
  const overrides: Record<string, any> = {};
  for (const [name, value] of Object.entries(appliedOverrides.value)) {
    if (value === undefined || value === null || value === "") continue;
    inputs[name] = formatVariableValue(value);
    overrides[name] = value;
  }
  draftInputs.value = inputs;
  draftOverrides.value = overrides;
  validationErrors.value = {};
}

const variableCount = computed(() => Object.keys(props.variables || {}).length);

const draftActiveCount = computed(() => {
  const declared = Object.keys(props.variables || {});
  return declared.filter((k) => hasDraftOverride(k)).length;
});

const isDirty = computed(() => {
  return JSON.stringify(draftOverrides.value) !== JSON.stringify(appliedOverrides.value);
});

const hasValidationErrors = computed(() => Object.keys(validationErrors.value).length > 0);

const saveButtonTooltip = computed(() => {
  if (hasValidationErrors.value) return "Fix invalid values before saving";
  if (!isDirty.value) return "No changes to save";
  return "Apply these overrides";
});

function placeholderFor(type: string): string {
  switch (type) {
    case "boolean": return "true / false";
    case "integer": return "42";
    case "number": return "3.14";
    case "array": return '["a","b"]';
    case "object": return '{"key":"value"}';
    default: return "Override value";
  }
}

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

function hasDraftOverride(varName: string): boolean {
  return Object.prototype.hasOwnProperty.call(draftOverrides.value, varName);
}

// Returns { value, error }. `value` is the parsed value on success, undefined
// on failure. `error` is a human-readable string when the input doesn't match
// the declared type.
function parseValueByType(value: string, type: string): { value?: any; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};

  switch (type) {
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (lower === "true") return { value: true };
      if (lower === "false") return { value: false };
      return { error: 'Expected "true" or "false"' };
    }
    case "integer": {
      if (!/^-?\d+$/.test(trimmed)) return { error: "Expected an integer (e.g. 42)" };
      const intVal = parseInt(trimmed, 10);
      if (Number.isNaN(intVal)) return { error: "Expected an integer (e.g. 42)" };
      return { value: intVal };
    }
    case "number": {
      const numVal = Number(trimmed);
      if (!Number.isFinite(numVal)) return { error: "Expected a number (e.g. 3.14)" };
      return { value: numVal };
    }
    case "array": {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          return { error: 'Expected a JSON array like ["a","b"]' };
        }
        return { value: parsed };
      } catch {
        return { error: 'Invalid JSON — expected an array like ["a","b"]' };
      }
    }
    case "object": {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          return { error: 'Expected a JSON object like {"key":"value"}' };
        }
        return { value: parsed };
      } catch {
        return { error: 'Invalid JSON — expected an object like {"key":"value"}' };
      }
    }
    default:
      return { value: trimmed };
  }
}

function handleInput(varName: string, variable: Variable, raw: string) {
  draftInputs.value = { ...draftInputs.value, [varName]: raw };

  if (!raw.trim()) {
    const nextOverrides = { ...draftOverrides.value };
    delete nextOverrides[varName];
    draftOverrides.value = nextOverrides;
    const nextErrors = { ...validationErrors.value };
    delete nextErrors[varName];
    validationErrors.value = nextErrors;
    return;
  }

  const { value, error } = parseValueByType(raw, variable.type);
  if (error) {
    // Invalid — keep the raw text, record the error, drop the parsed value so
    // the draft can't be saved with a bad value.
    const nextOverrides = { ...draftOverrides.value };
    delete nextOverrides[varName];
    draftOverrides.value = nextOverrides;
    validationErrors.value = { ...validationErrors.value, [varName]: error };
    return;
  }

  draftOverrides.value = { ...draftOverrides.value, [varName]: value };
  const nextErrors = { ...validationErrors.value };
  delete nextErrors[varName];
  validationErrors.value = nextErrors;
}

function clearDraftOverride(varName: string) {
  const nextInputs = { ...draftInputs.value };
  delete nextInputs[varName];
  draftInputs.value = nextInputs;

  const nextOverrides = { ...draftOverrides.value };
  delete nextOverrides[varName];
  draftOverrides.value = nextOverrides;

  const nextErrors = { ...validationErrors.value };
  delete nextErrors[varName];
  validationErrors.value = nextErrors;
}

function clearAll() {
  draftInputs.value = {};
  draftOverrides.value = {};
  validationErrors.value = {};
}

function revert() {
  resetDraftFromApplied();
}

function save() {
  if (hasValidationErrors.value || !isDirty.value) return;
  const overrides = { ...draftOverrides.value };
  appliedOverrides.value = overrides;
  emit("save-overrides", overrides, Object.keys(overrides).length > 0);
}
</script>
