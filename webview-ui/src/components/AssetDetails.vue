<template>
  <div
    class="flex h-full w-full flex-col overflow-scroll overflow-x-auto pt-6 shadow-xl text-gray-500"
  >
    <div class="px-4 sm:px-6 border-b pb-4">
      <h2 class="text-lg font-semibold font-mono leading-6 text-gray-300">
        {{ assetName }}
      </h2>
    </div>
    <div class="relative overflow-scroll py-6 flex-1 px-4 sm:px-6">
      <dl class="divide-y divide-gray-600">
        <div class="flex items-center justify-between">
          <div
            class="px-4 py-2 w-full grid grid-cols-2 gap-6 place-items-start sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0"
          >
            <dt>
              <span class="text-sm font-medium text-gray-200">Asset</span>
            </dt>
            <dd class="mt-1 text-sm text-gray-200 leading-6 sm:col-span-3 sm:mt-0 font-mono">
              {{ assetName }}
            </dd>
          </div>
        </div>
        <div class="px-4 py-2 items-center mt-2 mb-2 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0">
          <dt>
            <span class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono"
              >Asset Type</span
            >
          </dt>
          <dd class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono">
            <span
              class="inline-flex items-center rounded-md
              bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30"
              >Big Query</span
            >
          </dd>
        </div>
        <div class="px-4 py-2 items-center mt-2 mb-2 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0">
          <dt>
            <span class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono"
              > Schedule </span
            >
          </dt>
          <dd class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono">
            <span
              class="inline-flex items-center rounded-md
              bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20"
              > daily </span
            >
          </dd>
        </div>
        <div class="px-4 py-2 items-center mt-2 mb-2 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0">
          <dt>
            <span class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono"
              > Schedule </span
            >
          </dt>
          <dd class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono">
            <span
               class="font-semibold text-gray-400"> Unknown </span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
  <div></div>
  <div></div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from "vue";
import { PencilIcon } from "@heroicons/vue/20/solid";
import ListBox from "@/components/ui/select-menu/ListBox.vue";
const props = defineProps<{
  assetName: string;
}>();
</script>
