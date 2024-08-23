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