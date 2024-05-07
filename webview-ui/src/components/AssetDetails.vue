<template>
  <div
    class="flex h-full w-full flex-col overflow-scroll overflow-x-auto pt-6 shadow-xl text-gray-500"
  >
    <div class="px-4 sm:px-6 border-b pb-4">
      <h2 class="text-lg font-semibold font-mono leading-6 text-gray-300">
        {{ name }}
      </h2>
    </div>
    <div class="relative overflow-scroll py-6 flex-1 px-4 sm:px-6">
      <dl class="divide-y divide-gray-600">
        <DescriptionItem title="Asset" :value="name" />
        <DescriptionItem title="Type" :value="type" :className="classes.blueBadge" />
        <DescriptionItem title="Schedule" :value="schedule" :className="classes.grayBadge" />
        <DescriptionItem title="Owner" value="Unknown" className="font-semibold text-gray-400" />
      </dl>
    </div>
    <div class="border-b  flex flex-col gap-4 py-6 flex-1 px-4 sm:px-6">
      <h3 class="text-lg leading-6 font-medium text-gray-100 mb-2"> Description </h3>
      <p class="text-gray-300">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
const props = defineProps<{
  name: string;
  description: string;
  type: string;
  schedule: string;
  owner: string;
  id: string;
}>();

const classes = ref({
  blueBadge:
    "inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30",
  grayBadge:
    "inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20",
});
</script>
