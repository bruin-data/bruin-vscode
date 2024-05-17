<template>
  <div
    v-if="props !== null"
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
        <DescriptionItem title="Type" :value="type" :className="badgeClass.badgeStyle" />
        <DescriptionItem title="Schedule" :value="pipeline.schedule" :className="badgeClass.grayBadge" />
        <DescriptionItem title="Owner" value="Unknown" className="font-semibold text-gray-400" />
      </dl>
    </div>
    <div class="border-b flex flex-col gap-4 py-6 flex-1 px-4 sm:px-6">
      <h3 class="text-lg leading-6 font-medium text-gray-100 mb-2">Description</h3>
      <div class="max-w-4xl lg:mt-0 xl:col-end-1 xl:row-start-1">
        <p class="text-sm leading-8 text-gray-200 opacity-70 text-justify indent-8">{{ description }}</p>
      </div>
    </div>
  </div>
  <div class="flex" v-else>
    <MessageAlert message="This file is not a Bruin Asset or has No data to dipslay" />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, computed } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  schedule: string;
  owner: string;
  id: string;
  pipeline: any;
}>();

const badgeClass = computed(() => {
  const commonStyle =
    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset";
  console.log("Computed property recalculated.", badgeStyles[props.type]);
  return {
    commonStyle: commonStyle,
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle}  ${badgeStyles[props.type].main}`,
  };
});
</script>
