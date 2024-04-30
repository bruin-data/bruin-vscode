<template>
  <div :class="`flex items-center gap-x-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-indigo-600 divide-x divide-[color:var(--vscode-disabledForeground)] ${BGColor}`">
  <button
    type="button"
    class="inline-flex items-center justify-center gap-x-1.5 w-16 "
    @click="handleDefaultClick"
  >
    <CheckCircleIcon v-if="status === 'validated'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    <XCircleIcon v-if="status === 'failed'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    <span v-if="status === 'loading'" class="-ml-0.5 h-5 w-5 spinner"></span>
    {{ buttonLabel }}
  </button>
  <Menu as="div" class="relative inline-block text-left">
    <div>
      <MenuButton
        as="button">
        <ChevronDownIcon class="flex items-center h-5 w-5 pt-1" aria-hidden="true" />
      </MenuButton>
    </div>
    <MenuItems
      id="menu-items"
      class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
    >
      <div class="py-1">
        <MenuItem v-slot="{ active }" v-for="(item, index) in items" :key="index">
          <button
            @click="selectAction(item)"
            :class="[
              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
              'block w-full text-left px-4 py-2 text-sm',
            ]"
          >
            {{ item }}
          </button>
        </MenuItem>
      </div>
    </MenuItems>
  </Menu>
</div>
</template>

<script setup lang="ts">
import { defineProps, ref } from "vue";
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";
import { Menu, MenuItems, MenuItem, MenuButton } from "@headlessui/vue";

const props = defineProps<{
  buttonLabel: string;
  BGColor: string | null;
  status?: "validated" | "failed" | "loading" | null;
  items?: string[];
  defaultAction: () => void;
}>();

const buttonLabel = ref(props.buttonLabel);

function handleDefaultClick(event: { stopPropagation: () => void; }) {
  // Prevent the dropdown from opening when clicking the button part
  event.stopPropagation();
  if (props.defaultAction) {
    props.defaultAction();
  }
}
const emit = defineEmits(["execChoice"]);
function selectAction(action: string) {
  emit("execChoice", action);
  console.log(`Action selected: ${action}`);
}
</script>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
#menu-items {
  background-color: var(--vscode-foreground);
}
.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}
</style>


