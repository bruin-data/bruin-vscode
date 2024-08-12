<template>
  <div
    v-if="show"
      :style="{
        position: 'absolute',
        zIndex: 9999
      }"
      class="bg-editor-bg border border-editor-border b-[0.2px] rounded-md shadow-lg p-3 w-auto text-editor-fg -translate-x-8 -translate-y-24"
      @click.stop
  >
    <div class="space-y-2">
      <p > <span class="text-lg font-semibold">Name: </span> <span class="text-lg">{{ name }}</span></p>
      <p class="text-md flex items-center">
        Type:
        <span
          class="ml-1 px-1.5 py-0.5 text-sm font-medium rounded-full bg-editorWidget-background text-[#4ec9b0]"
        >
          {{ type }}
        </span>
      </p>
      <button
        @click="goToDetails"
        class="w-full mt-2 px-3 py-2 text-sm flex items-center justify-between bg-input-background hover:bg-menu-hoverBackground hover:text-bl rounded-sm transition-colors duration-200"
      >
        Go to asset details
        <span class="pl-2"><ArrowTopRightOnSquareIcon class="h-4 w-4 text-[#569cd6]" /></span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/20/solid";
import { defineProps, defineEmits } from "vue";

const props = defineProps<{
  show: boolean;
  name: string;
  type: string;
  path: string;
  external?: boolean;
}>();

const emit = defineEmits(["close", "goToDetails"]);

const goToDetails = () => {
  emit("goToDetails", props);
};


</script>
