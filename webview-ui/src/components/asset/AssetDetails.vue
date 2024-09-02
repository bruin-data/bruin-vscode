<template>
  <div class="flex flex-col items-start justify-between w-full">
    <div class="w-full">
      <div class="flex items-center space-x-2 w-full justify-between">
        <!-- Name editing -->
        <div 
          v-if="true" 
          class="font-md text-editor-fg text-lg font-mono"
          @dblclick="editName"
        >
          {{ name }}
        </div>
        <input 
          v-else 
          v-model="editableName"
          @blur="saveName"
          @keyup.enter="saveName"
          class="font-md text-editor-fg text-lg font-mono bg-transparent border-none focus:outline-none"
          :class="{ 'border-b border-editor-border': editingName }"
        />
        
        <div class="space-x-2">
          <DescriptionItem :value="type" :className="badgeClass.badgeStyle" />
          <DescriptionItem :value="pipeline.schedule" :className="badgeClass.grayBadge" />
        </div>
      </div>
      <div v-if="ownerExists" class="flex flex-wrap items-center">
        <DescriptionItem :value="owner" className="font-semibold text-editor-fg opacity-30" />
      </div>
    </div>

    <div v-if="props !== null" class="flex flex-col text-editor-fg bg-editor-bg w-full">
      <div class="">
        <!-- Description editing -->
        <p
          v-if="markdownDescription"
          class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4"
          v-html="markdownDescription"
          @dblclick="editDescription"
        ></p>
        <textarea
          v-else-if="editingDescription"
          v-model="editableDescription"
          @blur="saveDescription"
          class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4 bg-transparent border-none focus:outline-none"
        ></textarea>
        <p v-else class="text-sm text-editor-fg opacity-50 pt-4">
          No description available for this asset.
        </p>
      </div>
    </div>

    <div class="flex" v-else>
      <MessageAlert message="This file is either not a Bruin Asset or has no data to display." />
    </div>

    <vscode-divider class="border-t border-editor-border opacity-20 my-4"></vscode-divider>

    <div class="w-full">
      <AssetGeneral :schedule="scheduleExists ?  props.pipeline.schedule : ''" :environments="environments" :selectedEnvironment="selectedEnvironment"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";
import MarkdownIt from "markdown-it";
import AssetGeneral from "./AssetGeneral.vue";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  owner: string;
  id: string;
  pipeline: any;
  environments: string[]; 
  selectedEnvironment: string;
}>();

const ownerExists = computed(() => {
  return props.owner !== "" && props.owner !== "undefined" && props.owner !== null && props.owner !== undefined;
});

const scheduleExists = computed(() => {
  return props.pipeline.schedule !== "" && props.pipeline.schedule !== "undefined" && props.pipeline.schedule !== null && props.pipeline.schedule !== undefined;
});

const md = new MarkdownIt();
const markdownDescription = computed(() => {
  if (!props.description) {
    return null;
  }
  return md.render(props.description);
});

// State for name editing
const editingName = ref(false);
const editableName = ref(props.name);

const editName = () => {
  editingName.value = true;
};

const saveName = () => {
  editingName.value = false;
  //props.name = editableName.value;
};

// State for description editing
const editingDescription = ref(false);
const editableDescription = ref(props.description);

const editDescription = () => {
  editingDescription.value = true;
};

const saveDescription = () => {
  editingDescription.value = false;
  //props.description = editableDescription.value;
};

const badgeClass = computed(() => {
  const commonStyle =
    "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";
  
    const styleForType = badgeStyles[props.type] || defaultBadgeStyle;

  return {
    commonStyle: commonStyle,
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle} ${styleForType.main}`,
  };
});
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
</style>
