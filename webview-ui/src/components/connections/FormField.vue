<template>
  <div class="sm:col-span-4">
    <label :for="id" class="block text-sm font-medium leading-6 text-editor-fg">
      {{ label }}{{ !required ? " (Optional)" : "" }}
    </label>
    <div class="mt-2 relative">
      <div class="relative" v-if="!service_account.includes(id)">
        <input
          v-if="type === 'text' || type === 'password' || type === 'number'"
          :id="id"
          :type="inputType"
          :value="displayValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          :placeholder="displayValue ? '' : `Enter ${label.toLowerCase()}`"
          :required="required"
        />
        <button
          v-if="type === 'password'"
          type="button"
          class="absolute inset-y-0 right-0 flex items-center pr-3"
          @click="togglePasswordVisibility"
        >
          <EyeIcon v-if="!showPassword" class="h-5 w-5 text-input-foreground" />
          <EyeSlashIcon v-else class="h-5 w-5 text-input-foreground" />
        </button>
      </div>

      <div v-if="type === 'textarea' && !service_account.includes(id)" class="flex flex-col">
        <textarea
          :id="id"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          :placeholder="
            defaultValue !== undefined ? String(defaultValue) : `Enter ${label.toLowerCase()}`
          "
          :required="required && !selectedFile && !internalValue"
          :rows="rows"
          :cols="cols"
        />
      </div>

      <div v-if="id === 'service_account_json'" class="mt-2">
        <div class="flex space-x-4 mb-2">
          <vscode-radio-group :value="serviceAccountInputMethod" @change="handleInputMethodChange">
            <vscode-radio value="file" checked>Use File Picker</vscode-radio>
            <vscode-radio value="text">Input JSON Directly</vscode-radio>
          </vscode-radio-group>
        </div>

        <div v-if="serviceAccountInputMethod === 'file'" class="flex items-center">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelectionMessage"
            style="display: none"
          />
          <vscode-button
            appearance="icon"
            @click="triggerFileSelection"
            class="inline-flex items-center py-1 text-sm font-medium rounded-md"
          >
            <div class="flex items-center">
              <FolderIcon class="h-5 w-5 mr-2" />
              Choose File
            </div>
          </vscode-button>
          <span v-if="selectedFile" class="ml-2 text-sm text-inputPlaceholderForeground">{{
            selectedFile.name
          }}</span>
        </div>

        <textarea
          v-if="serviceAccountInputMethod === 'text'"
          :id="id"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          placeholder="Enter Service Account JSON"
          :required="required && !selectedFile && !internalValue"
          :rows="rows"
          :cols="cols"
        />
      </div>

      <div v-if="type === 'csv'" class="flex flex-col justify-start">
        <textarea
          :id="id"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          placeholder="Enter CSV values"
          :required="required"
          :rows="rows"
          :cols="cols"
        />
        <p class="mt-2 text-sm text-inputPlaceholderForeground">
          These top three players are set by default. You can also upload your own CSV file.
        </p>

        <div>
          <input type="file" @change="handleCSVUpload" accept=".csv" style="display: none" />
          <vscode-button
            appearance="icon"
            @click="$refs.csvFileInput.click()"
            class="inline-flex items-center py-1 text-sm font-medium rounded-md mt-2"
          >
            <div class="flex items-center">
              <FolderIcon class="h-5 w-5 mr-2" />
              Upload CSV
            </div>
          </vscode-button>
          <input
            type="file"
            ref="csvFileInput"
            @change="handleCSVUpload"
            style="display: none"
            accept=".csv"
          />
        </div>
      </div>

      <template v-if="type === 'select'">
        <div class="relative">
          <select
            :id="id"
            :value="displayValue"
            :required="required"
            @change="updateValue"
            :class="[
              'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm appearance-none pr-8',
              isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
            ]"
          >
            <option v-if="!displayValue" value="" disabled>Please Select</option>
            <option v-for="option in options" :key="option" :value="option">
              {{ formatConnectionName(option) }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDownIcon class="w-4 h-4 text-input-foreground" aria-hidden="true" />
          </div>
        </div>
      </template>
      <p v-if="isInvalid" class="mt-2 text-sm text-inputValidation-errorBorder">
        {{ formattedErrorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon, EyeIcon, EyeSlashIcon, FolderIcon } from "@heroicons/vue/24/outline";
import { defineProps, defineEmits, ref, watch, computed, onMounted, onUnmounted } from "vue";
import { formatConnectionName } from "./connectionUtility";
import { vscode } from "@/utilities/vscode";
const props = defineProps({
  errorMessage: String,
  id: String,
  label: String,
  type: String,
  modelValue: [String, Number],
  defaultValue: [String, Number],
  options: Array,
  defaultValue: [String, Number],
  rows: Number,
  cols: Number,
  required: {
    type: Boolean,
    default: false,
  },
  isInvalid: Boolean,
});

const emit = defineEmits(["update:modelValue", "clearError", "fileSelected"]);

const internalValue = ref(props.modelValue ?? props.defaultValue ?? "");
const showPassword = ref(false);
const selectedFile = ref(null);
const serviceAccountInputMethod = ref("file");
const service_account = ["service_account_json", "service_account_file"];
const inputType = computed(() => {
  return props.type === "password" ? (showPassword.value ? "text" : "password") : props.type;
});

const triggerFileSelection = () => {
  vscode.postMessage({
    command: "bruinConnections.fileSelected",
  });
};

const displayValue = computed(() => {
  return internalValue.value !== "" ? internalValue.value : props.defaultValue ?? "";
});

const formattedErrorMessage = computed(() => {
  if (!props.errorMessage) {
    if (
      props.id === "service_account_json" &&
      props.required &&
      !internalValue.value &&
      !selectedFile.value
    ) {
      return "Please either enter the Service Account JSON or choose a file";
    }
    return props.required ? "This field is required" : "";
  }
  try {
    const errorObj = JSON.parse(props.errorMessage);
    return errorObj.error
      ? errorObj.error.charAt(0).toUpperCase() + errorObj.error.slice(1)
      : props.errorMessage;
  } catch (e) {
    return props.errorMessage;
  }
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

watch(
  [() => props.modelValue, () => props.defaultValue],
  ([newModelValue, newDefaultValue]) => {
    if (newModelValue !== undefined && newModelValue !== null) {
      internalValue.value = newModelValue;
    } else if (newDefaultValue !== undefined && newDefaultValue !== null) {
      internalValue.value = newDefaultValue;
    } else {
      internalValue.value = "";
    }
  },
  { immediate: true }
);

const updateValue = (event) => {
  let value = props.type === "number" ? Number(event.target.value) : event.target.value;
  if (props.id === "players") {
    value = value.split(",").map((player) => player.trim());
  }
  internalValue.value = value;
  emit("update:modelValue", value);
  emit("clearError");
  // Clear the selected file when text is entered in the textarea
  if (props.id === "service_account_json" && value) {
    selectedFile.value = null;
  }

  validateAndEmit();
};

const handleCSVUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target.result;
      const playersArray = csvContent.split(",").map((player) => player.trim());
      internalValue.value = playersArray.join(", ");
      emit("update:modelValue", playersArray);
      emit("clearError");
    };
    reader.readAsText(file);
  }
};

const handleFileSelectionMessage = (event) => {
  const message = event.data;

  if (message.command === "selectedFilePath") {
    const payload = message.payload;

    switch (payload.status) {
      case "success":
        console.log("File selected successfully", payload);
        selectedFile.value = {
          name: payload.message.fileName,
          path: payload.message.filePath,
        };
        internalValue.value = payload.message.fileName;
        emit("fileSelected", {
          name: payload.message.fileName,
          path: payload.message.filePath,
        });
        break;
    }
  }
  internalValue.value = "";

};
const isValidInput = computed(() => {
  return !!internalValue.value || !!selectedFile.value;
});

const validateAndEmit = () => {
  if (isValidInput.value) {
    emit("clearError");
  }
};

const handleInputMethodChange = (event) => {
  serviceAccountInputMethod.value = event.target.value;
  if (serviceAccountInputMethod.value === "file") {
    internalValue.value = "";
    selectedFile.value = null;
  } else {
    selectedFile.value = null;
  }
  emit("update:modelValue", "");
  emit("clearError");
};

// Add event listener when component mounts
onMounted(() => {
  window.addEventListener("message", handleFileSelectionMessage);
});

// Remove event listener when component unmounts to prevent memory leaks
onUnmounted(() => {
  window.removeEventListener("message", handleFileSelectionMessage);
});
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>
