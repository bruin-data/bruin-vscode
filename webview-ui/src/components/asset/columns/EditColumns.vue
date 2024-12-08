<template>
  <div class="flex flex-col space-y-2">
    <h2 class="text-2xl font-bold mb-4">Manage Columns</h2>
    <div class="flex justify-end mb-4">
      <vscode-button @click="addColumn" class="px-4 py-2 rounded focus:outline-none">
        Add Column
      </vscode-button>
    </div>
    <div
      v-for="(column, index) in localColumns"
      :key="index"
      class="container mb-6 bg-editorWidget-bg p-2 rounded-md"
    >
      <div class="flex justify-between items-center mb-4 w-full">
        <div class="w-11/12 flex justify-between items-center">
          <vscode-text-field
            :value="column.name"
            placeholder="Column Name"
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
        <div class="flex flex-col space-y-2 w-11/12">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center space-x-4">
              <h3 class="text-lg font-semibold mr-2">Checks</h3>
              <div class="flex flex-wrap gap-2">
                <vscode-badge
                  v-for="(check, index) in column.checks"
                  :key="index"
                  :title="getCheckTooltip(check, column)"
                >
                  {{ check.name }}
                  <template v-if="check.value"> ({{ check.value.join(", ") }}) </template>
                </vscode-badge>
              </div>
            </div>
          </div>

          <div v-if="expandedColumns[index]" class="flex flex-col space-y-2">
            <div class="flex flex-wrap gap-2">
              <vscode-checkbox
                v-for="check in availableChecks(column)"
                :key="check.id"
                :checked="false"
                @change="
                  updateColumnCheck(index, check, $event.target.checked, null, {
                    name: check,
                    value: check === 'accepted_values' ? [] : null,
                  })
                "
              >
                {{ check }}
              </vscode-checkbox>
            </div>

            <div class="flex flex-col space-y-4 mt-2 w-3/4">
              <div
                v-for="(check, checkIndex) in column.checks"
                :key="checkIndex"
                class="flex items-start"
              >
                <vscode-checkbox
                  :checked="check.blocking"
                  class="w-40 flex-shrink-0"
                  @change="
                    updateColumnCheck(index, check.name, $event.target.checked, null, {
                      blocking: $event.target.checked,
                    })
                  "
                >
                  {{ check.name }}
                </vscode-checkbox>
                <div v-if="check.name === 'accepted_values'" class="flex flex-col space-y-2 w-full">
                  <div
                    v-for="(value, valueIndex) in check.value"
                    :key="valueIndex"
                    class="flex items-center space-x-2"
                  >
                    <vscode-text-field
                      :value="value"
                      class="bg-transparent border-none flex-grow"
                      placeholder="Accepted Values"
                      @input="
                        updateColumnCheck(
                          index,
                          'accepted_values',
                          $event.target.value,
                          valueIndex,
                          {
                            value: [
                              ...check.value.slice(0, valueIndex),
                              $event.target.value,
                              ...check.value.slice(valueIndex + 1),
                            ],
                          }
                        )
                      "
                    />
                    <vscode-button
                      @click="addAcceptedValue(index, checkIndex)"
                      appearance="secondary"
                      class="p-1 hover:bg-editor-button-hover-bg rounded"
                    >
                      <PlusIcon class="h-4 w-4" />
                    </vscode-button>
                    <vscode-button
                      v-if="check.value.length > 1 && valueIndex > 0"
                      @click="removeAcceptedValue(index, checkIndex, valueIndex)"
                      appearance="secondary"
                      class="p-1 hover:bg-editor-button-hover-bg rounded"
                    >
                      <MinusIcon class="h-4 w-4" />
                    </vscode-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <vscode-button
            @click="toggleExpand(index)"
            appearance="secondary"
            class="flex items-center justify-center mt-2"
          >
            <ChevronDownIcon v-if="!expandedColumns[index]" class="h-4 w-4 ml-2" />
            <ChevronUpIcon v-else class="h-4 w-4 ml-2" />
          </vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, defineEmits, defineProps, reactive } from "vue";
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/vue/20/solid";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:columns"]);

const localColumns = ref([]);
const expandedColumns = reactive({});

const availableChecks = [
  "unique",
  "not_null",
  "positive",
  "negative",
  "non_negative",
  "accepted_values",
  "pattern",
];

const updateColumnCheck = (columnIndex, checkName, checked, valueIndex, checkUpdate) => {
  const column = localColumns.value[columnIndex];
  const existingCheck = column.checks.find((check) => check.name === checkName);
  if (existingCheck) {
    if (checkUpdate) {
      Object.assign(existingCheck, checkUpdate);
    }
    if (checked!== undefined) {
      existingCheck.blocking =  checked;
    }
    if (valueIndex!== null && existingCheck.value) {
      existingCheck.value[valueIndex] = checked;
    }
  } else {
    column.checks.push({
      name: checkName,
     ...checkUpdate,
      blocking:  checked,
    });
  }
  emitUpdate();
};

const addAcceptedValue = (index, checkIndex) => {
  localColumns.value[index].checks[checkIndex].value.push("");
  emitUpdate();
};

const removeAcceptedValue = (columnIndex, checkIndex, valueIndex) => {
  localColumns.value[columnIndex].checks[checkIndex].value.splice(valueIndex, 1);
  emitUpdate();
};

onMounted(() => {
  localColumns.value = JSON.parse(JSON.stringify(props.columns));
  localColumns.value.forEach((column) => {
    if (!Array.isArray(column.checks)) {
      column.checks = column.checks || [];
    }
  });
});

const toggleExpand = (index) => {
  expandedColumns[index] = !expandedColumns[index];
};

const addColumn = () => {
  localColumns.value.push({
    name: "",
    type: "string",
    description: "",
    checks: [],
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


const emitUpdate = () => {
  const formattedColumns = localColumns.value.map((column) => ({
    ...column,
    checks: column.checks
      .map((check) => ({
        id: check.id,
        name: check.name,
        value: check.value,
        blocking: check.blocking || true,
      })),
  }));
  emit("update:columns", formattedColumns);
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
