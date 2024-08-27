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
      v-for="(column, index) in columns"
      :key="index"
      class="container mb-6 bg-editorWidget-bg p-2 rounded-md"
    >
      <div class="flex justify-between items-center mb-4 w-full">
        <div class="w-11/12 flex justify-between items-center">
          <vscode-text-field
            placeholder="Column Name"
            v-model="column.name"
            class="border-none p-0 bg-transparent"
          >
          </vscode-text-field>
          <vscode-dropdown v-model="column.type" @change="saveChanges" class="px-4 py-2">
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
          v-model="column.description"
          placeholder="Description"
          class="w-11/12 "
        >
        </vscode-text-area>
        <div class="flex flex-col space-y-2 w-11/12">
          <div class="flex items-start justify-between flex-wrap">
            <vscode-checkbox v-model="column.checks.unique" @change="saveChanges">
              Unique
            </vscode-checkbox>
            <vscode-checkbox v-model="column.checks.notNull" @change="saveChanges">
              Not Null
            </vscode-checkbox>
            <vscode-checkbox v-model="column.checks.positive" @change="saveChanges">
              Positive
            </vscode-checkbox>
            <vscode-checkbox v-model="column.checks.negative" @change="saveChanges">
              Negative
            </vscode-checkbox>
            <vscode-checkbox v-model="column.checks.notNegative" @change="saveChanges">
              Non Negative
            </vscode-checkbox>
          </div>
          <div class="flex flex-col w-2/4 space-y-2 mt-2">
            <div>
              <vscode-checkbox v-model="column.checks.accepted_values" @change="saveChanges" class="w-1/2">
                Accepted Values
              </vscode-checkbox>
              <vscode-text-field
                class="bg-transparent p-0 w-1/2"
                v-model="column.checks.accepted_values"
                @change="saveChanges"
                placeholder="Accepted Values"
                :disabled="!column.checks.accepted_values"
              />
            </div>
            <div>
              <vscode-checkbox v-model="column.checks.notNull" @change="saveChanges" class="w-1/2">
                Pattern
              </vscode-checkbox>
              <vscode-text-field
                class="bg-transparent p-0 w-1/2"
                v-model="column.checks.accepted_values"
                @change="saveChanges"
                placeholder="Accepted Values"
                :disabled="!column.checks.accepted_values"
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>


  <!-- Other tabs content can be added here -->
</template>

<script setup>
import { ref, reactive } from "vue";
import { TrashIcon } from "@heroicons/vue/20/solid";

const tabs = ["Details", "Columns"]; // Add more tabs as needed
const activeTab = ref("Columns");

const columns = reactive([
  {
    name: "ID",
    type: "integer",
    description: "Unique identifier",
    checks: { unique: true, notNull: true },
  },
  {
    name: "Name",
    type: "string",
    description: "Asset name",
    checks: { unique: false, notNull: true },
  },
]);

const addColumn = () => {
  columns.push({
    name: "",
    type: "string",
    description: "",
    checks: { unique: false, notNull: false },
  });
};

const removeColumn = (index) => {
  if (confirm("Are you sure you want to remove this column?")) {
    columns.splice(index, 1);
    saveChanges();
  }
};

const saveChanges = () => {
  // Here you would typically send the updated columns data to your backend
  console.log("Saving changes:", columns);
};
</script>
