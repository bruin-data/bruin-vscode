<template>
    <div class="p-4 bg-editor-bg text-editor-fg">
      <!-- Asset Name -->
      <div class="mb-4">
        <label for="assetName" class="block text-sm font-medium mb-1">Asset Name</label>
        <input
          id="assetName"
          v-model="editedAsset.name"
          class="w-full px-3 py-2 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
        />
      </div>
  
      <!-- Asset Type -->
      <div class="mb-4">
        <label for="assetType" class="block text-sm font-medium mb-1">Asset Type</label>
        <select
          id="assetType"
          v-model="editedAsset.type"
          class="w-full px-3 py-2 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
        >
          <option value="bq-sql">BigQuery SQL</option>
          <option value="snowflake-sql">Snowflake SQL</option>
        </select>
      </div>
  
      <!-- Description -->
      <div class="mb-4">
        <label for="description" class="block text-sm font-medium mb-1">Description</label>
        <textarea
          id="description"
          v-model="editedAsset.description"
          rows="3"
          class="w-full px-3 py-2 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
        ></textarea>
      </div>
  
      <!-- Materialization -->
 <!--      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Materialization</label>
        <div class="flex items-center space-x-2">
          <select
            v-model="editedAsset.materialization.type"
            class="px-3 py-2 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
          >
            <option value="table">Table</option>
            <option value="view">View</option>
          </select>
        </div>
      </div> -->
  
      <!-- Columns -->
 <!--      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Columns</label>
        <div v-for="(column, index) in editedAsset.columns" :key="index" class="mb-2 p-2 border border-editor-border rounded">
          <div class="flex items-center justify-between mb-2">
            <input
              v-model="column.name"
              placeholder="Column name"
              class="w-1/3 px-2 py-1 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
            />
            <input
              v-model="column.type"
              placeholder="Column type"
              class="w-1/3 px-2 py-1 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
            />
            <button @click="removeColumn(index)" class="text-editor-button-fg hover:text-editor-button-hover-fg">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
          <input
            v-model="column.description"
            placeholder="Column description"
            class="w-full px-2 py-1 bg-editor-input-bg text-editor-fg border border-editor-border rounded mb-2"
          />
          <div class="space-y-2">
            <div v-for="(check, checkIndex) in column.checks" :key="checkIndex" class="flex items-center space-x-2">
              <input
                v-model="check.name"
                placeholder="Check name"
                class="w-1/3 px-2 py-1 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
              />
              <input
                v-if="check.name === 'accepted_values'"
                v-model="check.value"
                placeholder="Accepted values"
                class="w-1/3 px-2 py-1 bg-editor-input-bg text-editor-fg border border-editor-border rounded"
              />
              <button @click="removeCheck(column, checkIndex)" class="text-editor-button-fg hover:text-editor-button-hover-fg">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
            <button @click="addCheck(column)" class="text-editor-button-fg hover:text-editor-button-hover-fg">
              Add Check
            </button>
          </div>
        </div>
        <button @click="addColumn" class="mt-2 text-editor-button-fg hover:text-editor-button-hover-fg">
          Add Column
        </button>
      </div> -->
  
      <!-- Save and Cancel buttons -->
      <div class="flex justify-end space-x-2">
        <button @click="cancel" class="px-4 py-2 bg-editor-button-bg text-editor-button-fg rounded hover:bg-editor-button-hover-bg">
          Cancel
        </button>
        <button @click="save" class="px-4 py-2 bg-editor-primary-button-bg text-editor-primary-button-fg rounded hover:bg-editor-primary-button-hover-bg">
          Save
        </button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { XMarkIcon } from '@heroicons/vue/24/outline';
  
  const props = defineProps<{
    asset: any;
  }>();
  
  const emit = defineEmits(['save', 'cancel']);
  
  const editedAsset = ref({ ...props.asset });
  
  const addColumn = () => {
    editedAsset.value.columns.push({
      name: '',
      type: '',
      description: '',
      checks: []
    });
  };
  
  const removeColumn = (index: number) => {
    editedAsset.value.columns.splice(index, 1);
  };
  
  const addCheck = (column: any) => {
    column.checks.push({ name: '', value: '' });
  };
  
  const removeCheck = (column: any, index: number) => {
    column.checks.splice(index, 1);
  };
  
  const save = () => {
    emit('save', editedAsset.value);
  };
  
  const cancel = () => {
    emit('cancel');
  };
  
  onMounted(() => {
    if (!editedAsset.value.columns) {
      editedAsset.value.columns = [];
    }
  });
  </script>