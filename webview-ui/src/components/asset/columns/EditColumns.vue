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
        <vscode-text-area
          :value="column.description"
          cols="50"
          resize="vertical"
          rows="1"
          placeholder="Description"
          class="w-11/12"
          @input="updateColumn(index, 'description', $event.target.value)"
        >
        </vscode-text-area>
        <div class="flex flex-col space-y-2 w-11/12">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center space-x-4">
              <h3 class="text-lg font-semibold mr-2">Checks</h3>
              <div class="flex flex-wrap gap-2">
                <div v-for="(value, key) in column.checks" :key="key">
                  <vscode-badge
                    v-if="
                      value === true &&
                      key !== 'accepted_values' &&
                      !['blocking', 'acceptedValuesEnabled', 'patternEnabled'].includes(key)
                    "
                  >
                    {{ key }}
                  </vscode-badge>
                </div>
                <vscode-badge v-if="column.checks.acceptedValuesEnabled">
                  accepted_values
                </vscode-badge>

                <vscode-badge v-if="column.checks.patternEnabled && column.checks.pattern">
                  pattern
                </vscode-badge>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <vscode-label for="blocking">Blocking</vscode-label>
              <vscode-checkbox
                id="blocking"
                :checked="column.checks.blocking"
                @change="updateColumnCheck(index, 'blocking', $event.target.checked)"
              ></vscode-checkbox>
            </div>
          </div>

          <div v-if="expandedColumns[index]" class="flex flex-col space-y-2">
            <div class="flex flex-wrap gap-2">
              <vscode-checkbox
                v-for="check in availableChecks"
                :key="check"
                :checked="column.checks[check]"
                @change="updateColumnCheck(index, check, $event.target.checked)"
              >
                {{ check }}
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
                <div
                  v-if="column.checks.acceptedValuesEnabled"
                  class="flex flex-col space-y-2 w-full"
                >
                  <div
                    v-for="(value, valueIndex) in column.checks.accepted_values"
                    :key="valueIndex"
                    class="flex items-center space-x-2"
                  >
                    <vscode-text-field
                      :value="value"
                      class="bg-transparent border-none flex-grow"
                      placeholder="Accepted Values"
                      @input="
                        updateColumnCheck(index, 'accepted_values', $event.target.value, valueIndex)
                      "
                    />
                    <vscode-button
                      @click="addAcceptedValue(index)"
                      appearance="secondary"
                      class="p-1 hover:bg-editor-button-hover-bg rounded"
                    >
                      <PlusIcon class="h-4 w-4" />
                    </vscode-button>
                    <vscode-button
                      v-if="column.checks.accepted_values.length > 1 && valueIndex > 0"
                      @click="removeAcceptedValue(index, valueIndex)"
                      appearance="secondary"
                      class="p-1 hover:bg-editor-button-hover-bg rounded"
                    >
                      <MinusIcon class="h-4 w-4" />
                    </vscode-button>
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
                  v-if="column.checks.patternEnabled"
                  :value="column.checks.pattern"
                  class="bg-transparent border-none w-full"
                  placeholder="Pattern"
                  @input="updateColumnCheck(index, 'pattern', $event.target.value)"
                />
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
console.log("localColumns", props.columns);

onMounted(() => {
  localColumns.value = JSON.parse(JSON.stringify(props.columns));
});

const expandedColumns = reactive({});

const availableChecks = ["unique", "notNull", "positive", "negative", "notNegative"];

const toggleExpand = (index) => {
  expandedColumns[index] = !expandedColumns[index];
};

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
