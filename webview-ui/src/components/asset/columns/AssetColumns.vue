<template>
  <!-- Columns Management Interface -->
  <div class="flex flex-col space-y-2">
    <h2 class="text-2xl font-bold mb-4">Manage Columns</h2>

    <!-- Add Column Button -->
    <div class="flex justify-end mb-4">
      <vscode-button @click="addColumn" class="px-4 py-2 rounded focus:outline-none">
        Add Column
      </vscode-button>
    </div>

    <!-- Columns List -->
    <div
      v-for="(column, index) in props.columns"
      :key="index"
      class="container mb-6 bg-editorWidget-bg p-2 rounded-md"
    >
      <div class="flex justify-between items-center mb-4 w-full">
        <div class="w-11/12 flex justify-between items-center">
          <vscode-text-field
            placeholder="Column Name"
            :value="column.name"
            class="border-none p-0 bg-transparent"
            @input="updateColumn(index, 'name', $event.target.value)"
          >
          </vscode-text-field>
          <vscode-dropdown
            :value="column.type"
            class="px-4 py-2"
            @change="updateColumn(index, 'type', $event.target.value)"
          >
            <vscode-option value="string">String</vscode-option>
            <vscode-option value="integer">Integer</vscode-option>
            <vscode-option value="float">Float</vscode-option>
            <vscode-option value="boolean">Boolean</vscode-option>
            <vscode-option value="date">Date</vscode-option>
          </vscode-dropdown>
        </div>
        <button
          @click="removeColumn(index)"
          class="text-errorForeground hover:text-editorError-foreground mr-2"
        >
          <TrashIcon class="h-5 w-5" />
        </button>
      </div>
      <div class="space-y-4">
        <vscode-text-area
          cols="50"
          resize="vertical"
          :value="column.description"
          placeholder="Description"
          class="w-11/12"
          @input="updateColumn(index, 'description', $event.target.value)"
        >
        </vscode-text-area>
        <div class="flex flex-col space-y-2 w-11/12">
          <div class="flex items-start justify-between flex-wrap">
            <vscode-checkbox
              :checked="column.checks.unique"
              @change="updateColumnCheck(index, 'unique', $event.target.checked)"
            >
              Unique
            </vscode-checkbox>
            <vscode-checkbox
              :checked="column.checks.notNull"
              @change="updateColumnCheck(index, 'notNull', $event.target.checked)"
            >
              Not Null
            </vscode-checkbox>
            <vscode-checkbox
              v-if="column.type === 'integer'"
              :checked="column.checks.positive"
              @change="updateColumnCheck(index, 'positive', $event.target.checked)"
            >
              Positive
            </vscode-checkbox>
            <vscode-checkbox
              v-if="column.type === 'integer'"
              :checked="column.checks.negative"
              @change="updateColumnCheck(index, 'negative', $event.target.checked)"
            >
              Negative
            </vscode-checkbox>
            <vscode-checkbox
              v-if="column.type === 'integer'"
              :checked="column.checks.notNegative"
              @change="updateColumnCheck(index, 'notNegative', $event.target.checked)"
            >
              Non Negative
            </vscode-checkbox>
          </div>
          <div class="flex flex-col space-y-4 mt-2 w-3/4">
            <div class="flex items-start">
              <vscode-checkbox
                :checked="column.checks.acceptedValuesEnabled"
                class="w-40 flex-shrink-0"
                @change="updateColumnCheck(index, 'acceptedValuesEnabled', $event.target.checked)"
              >
                Accepted Values
              </vscode-checkbox>

              <div class="flex flex-col space-y-2 w-full">
                <div
                  v-for="(value, valueIndex) in column.checks.accepted_values"
                  :key="valueIndex"
                  class="flex items-center space-x-2"
                >
                  <vscode-text-field
                    class="bg-transparent border-none flex-grow"
                    :value="value"
                    placeholder="Accepted Values"
                    :disabled="!column.checks.acceptedValuesEnabled"
                    @input="
                      updateColumnCheck(index, 'accepted_values', $event.target.value, valueIndex)
                    "
                  />
                  <button
                    class="p-1 hover:bg-editor-button-hover-bg rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!column.checks.acceptedValuesEnabled"
                    @click="addAcceptedValue(index)"
                  >
                    <PlusIcon class="h-4 w-4" />
                  </button>
                  <button
                    v-if="column.checks.accepted_values.length > 1 && valueIndex > 0"
                    @click="removeAcceptedValue(index, valueIndex)"
                    class="p-1 hover:bg-editor-button-hover-bg rounded"
                  >
                    <MinusIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <vscode-checkbox
                :checked="column.checks.patternEnabled"
                class="w-40 flex-shrink-0"
                @change="updateColumnCheck(index, 'patternEnabled', $event.target.checked)"
              >
                Pattern
              </vscode-checkbox>
              <vscode-text-field
                class="bg-transparent border-none w-full"
                :value="column.checks.pattern"
                placeholder="Pattern"
                :disabled="!column.checks.patternEnabled"
                @input="updateColumnCheck(index, 'pattern', $event.target.value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, defineEmits, defineProps } from "vue";
import { TrashIcon, PlusIcon, MinusIcon } from "@heroicons/vue/20/solid";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:columns"]);

const localColumns = ref([]);
console.log("localColumns", props.columns);

onMounted(() => {
  localColumns.value = JSON.parse(JSON.stringify(props.columns));
});

const addColumn = () => {
  console.log("addColumn", JSON.parse(JSON.stringify(props.columns)));
  localColumns.value.push({
    name: "",
    type: "string",
    description: "",
    checks: {
      unique: false,
      notNull: false,
      positive: false,
      negative: false,
      notNegative: false,
      acceptedValuesEnabled: false,
      accepted_values: [""],
      patternEnabled: false,
      pattern: "",
    },
  });
  emitUpdate();
};

const removeColumn = (index) => {
  localColumns.value.splice(index, 1);
  emitUpdate();
};

const updateColumn = (index, key, value) => {
  localColumns.value[index][key] = value;
  emitUpdate();
};

const updateColumnCheck = (columnIndex, key, value, valueIndex = null) => {
  if (key === "accepted_values") {
    if (valueIndex !== null) {
      localColumns.value[columnIndex].checks.accepted_values[valueIndex] = value;
    } else {
      localColumns.value[columnIndex].checks.accepted_values.push(value);
    }
  } else {
    localColumns.value[columnIndex].checks[key] = value;
  }
  emitUpdate();
};

const addAcceptedValue = (index) => {
  localColumns.value[index].checks.accepted_values.push("");
  emitUpdate();
};

const removeAcceptedValue = (columnIndex, valueIndex) => {
  localColumns.value[columnIndex].checks.accepted_values.splice(valueIndex, 1);
  emitUpdate();
};

const emitUpdate = () => {
  emit("update:columns", localColumns.value);
};

watch(
  () => props.columns,
  (newColumns) => {
    localColumns.value = JSON.parse(JSON.stringify(newColumns));
  },
  { deep: true }
);
</script>

<style scoped>
vscode-dropdown::part(control) {
  border: none;
  outline: none;
}
vscode-text-field::part(input) {
  border: none;
  outline: none;
}
</style>
