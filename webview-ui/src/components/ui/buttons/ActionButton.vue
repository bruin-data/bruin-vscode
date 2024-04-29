<template>
  <Menu as="div" class="relative inline-block text-left">
    <div>
      <button
        type="button"
        :class="`inline-flex items-center gap-x-1.5 
          rounded-md px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-indigo-600 ${BGColor}`"
          @click="handleDefaultClick"
      >
        <CheckCircleIcon v-if="status === 'validated'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        <XCircleIcon v-if="status === 'failed'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        <span v-if="status === 'loading'" class="-ml-0.5 h-5 w-5 spinner"></span>

        <slot></slot>
        <ChevronDownIcon class="-mr-1 h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div>
      <MenuItems
        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1">
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'block px-4 py-2 text-sm',
              ]"
              >Downstream</a
            >
          </MenuItem>
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'block px-4 py-2 text-sm',
              ]"
              >Pipeline</a
            >
          </MenuItem>
        </div>
      </MenuItems>
    </div>
  </Menu>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";
import { Menu, MenuItems, MenuItem} from "@headlessui/vue";

const props = defineProps<{
  BGColor: string | null;
  status?: "validated" | "failed" | "loading" | null;
  handleDefaultClick?: () => void;
}>();
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
.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}
</style>
