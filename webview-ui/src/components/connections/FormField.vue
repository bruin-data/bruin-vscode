<template>
    <div class="sm:col-span-4">
      <label :for="id" class="block text-sm font-medium leading-6 text-editor-fg">
        {{ label }}
      </label>
      <div class="mt-2 relative">
        <input
          v-if="type !== 'select'"
          :id="id"
          :type="type"
          :value="defaultValue ? defaultValue : modelValue"
          @input="updateValue"
          class="block w-full rounded-md border-0 py-1.5 text-editor-bg shadow-sm ring-1 ring-inset ring-editor-border placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm"
          :placeholder="`Enter ${label.toLowerCase()}`"
          :required = "id === 'connection_name'"
        />
        <template v-else>
          <select
            :id="id"
            :value="modelValue"
            @change="updateValue"
            class="block w-full rounded-md border-0 py-1.5 text-editor-bg shadow-sm ring-1 ring-inset ring-editor-border focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm appearance-none pr-8"
          >
            <option value="" disabled selected hidden>Please Select</option>
            <option v-for="option in options" :key="option" :value="option">
              {{ option.charAt(0).toUpperCase() + option.slice(1) }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDownIcon class="w-4 h-4 text-editor-bg" aria-hidden="true" />
          </div>
        </template>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ChevronDownIcon } from "@heroicons/vue/24/outline";
  
  const props = defineProps(['id', 'label', 'type', 'modelValue', 'options', 'defaultValue']);
  const emit = defineEmits(['update:modelValue']);
  
  const updateValue = (event) => {
    let value = event.target.value;
    if (props.type === 'number') {
      value = Number(value);
    }
    emit('update:modelValue', value);
  };
  </script>