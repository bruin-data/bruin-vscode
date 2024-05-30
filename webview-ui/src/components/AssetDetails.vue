<template>
  <div
    v-if="props !== null"
    class="flex flex-col h-1/4 overflow-auto shadow-xl text-gray-500 bg-editor-bg max-h-72"
  >
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-editor-border">
            <tbody class="divide-y divide-editor-border bg-editor-bg">
              <tr>
                <td class="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                  <div class="flex items-center">
                    <div class="ml-4">
                      <div class="font-md text-editor-fg text-lg">{{ name }}</div>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-5 text-sm text-editor-fg">
                  <DescriptionItem title="Type" :value="type" :className="badgeClass.badgeStyle" />
                </td>
                <td class="whitespace-nowrap px-3 py-5 text-sm text-editor-fg">
                  <DescriptionItem
                    title="Schedule"
                    :value="pipeline.schedule"
                    :className="badgeClass.grayBadge"
                  />
                </td>
                <td class="whitespace-nowrap px-3 py-5 text-sm text-editor-fg">
                  <DescriptionItem
                    title="Owner"
                    value="Unknown"
                    className="font-semibold text-gray-400"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="border-b py-6 px-4 sm:px-6 bg-editor-bg">
      <h3 class="text-lg leading-6 font-medium text-gray-100 mb-2">Description</h3>
      <div class="max-w-3xl">
        <p
          class="max-h-full overflow-auto text-sm leading-8 text-editor-fg opacity-65 text-justify indent-8 prose"
          v-html="markdownDescription"
        ></p>
      </div>
    </div>
  </div>
  <div class="flex" v-else>
    <MessageAlert message="This file is not a Bruin Asset or has No data to display" />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, computed } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";
import MarkdownIt from "markdown-it";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  schedule: string;
  owner: string;
  id: string;
  pipeline: any;
}>();

const md = new MarkdownIt();
const markdownDescription = computed(() => {
  return md.render(props.description);
});

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
