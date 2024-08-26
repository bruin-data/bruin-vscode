<template>
  <div class="relative w-full flex flex-col">
    <!-- Name and badges -->
    <div class="flex items-center justify-between w-full mt-2 pt-4">
      <div class="flex items-center space-x-2 font-md text-editor-fg text-lg font-mono">
        <span
          ref="nameElement"
          :contenteditable="isEditingName"
          @dblclick="startEditingName"
          @blur="saveName"
          @keydown.enter.prevent="saveName"
          @input="updateEditableName"
          >{{ name }}</span
        >
      </div>
      <div class="flex space-x-2">
        <DescriptionItem :value="type" :className="badgeClass.badgeStyle" />
        <DescriptionItem
          v-if="scheduleExists"
          :value="pipeline.schedule"
          :className="badgeClass.grayBadge"
        />
      </div>
    </div>

    <!-- Description and owner -->
    <div>
      <div
        ref="descriptionElement"
        :contenteditable="isEditingDescription"
        @blur="saveDescription"
        @keydown.enter.prevent="saveDescription"
        @dblclick="startEditingDescription"
        @input="updateEditableDescription"
        class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4"
      >
        <div v-if="description" v-html="markdownDescription"></div>
        <p v-else class="opacity-50">No description available for this asset.</p>
      </div>
    </div>
    <vscode-divider class="border-t border-editor-border opacity-20 my-4"></vscode-divider>

    <!-- Displaying other details in view mode -->
    <AssetGeneral
      :schedule="scheduleExists ? pipeline.schedule : ''"
      :environments="environments"
      :selectedEnvironment="selectedEnvironment"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import AssetGeneral from "./AssetGeneral.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";
import MarkdownIt from "markdown-it";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  owner: string;
  pipeline: any;
  environments: string[];
  selectedEnvironment: string;
  columns: any[];
  checks: any[];
}>();

const emit = defineEmits(["update:name", "update:description"]);

const nameElement = ref();
const descriptionElement = ref();
const isEditingName = ref(false);
const isEditingDescription = ref(false);
const editableName = ref(props.name);
const editableDescription = ref(props.description);

const assetData = computed(() => ({
  name: editableName.value,
  description: editableDescription.value,
  type: props.type,
  owner: props.owner,
  pipeline: props.pipeline,
  columns: props.columns,
  checks: props.checks,
  materialization: { type: "table" },
}));

const ownerExists = computed(() => props.owner && props.owner !== "undefined");
const scheduleExists = computed(
  () => props.pipeline.schedule && props.pipeline.schedule !== "undefined"
);

const md = new MarkdownIt();
const markdownDescription = computed(() =>
  props.description ? md.render(props.description) : null
);

const badgeClass = computed(() => {
  const commonStyle =
    "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";
  const styleForType = badgeStyles[props.type] || defaultBadgeStyle;
  return {
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle} ${styleForType.main}`,
  };
});

const startEditingName = () => {
  isEditingName.value = true;
  nextTick(() => {
    nameElement.value.focus();
  });
};

const startEditingDescription = () => {
  isEditingDescription.value = true;
  nextTick(() => {
    descriptionElement.value.focus();
  });
};

const updateEditableName = (event) => {
  editableName.value = event.target.textContent;
};

const updateEditableDescription = (event) => {
  editableDescription.value = event.target.textContent;
};

const saveName = () => {
  isEditingName.value = false;
  if (editableName.value !== props.name) {
    emit('update:name', editableName.value);
    vscode.postMessage({
      command: 'bruin.updateAsset',
      asset: assetData.value,
    });
  }
};

const saveDescription = () => {
  isEditingDescription.value = false;
  if (editableDescription.value !== props.description) {
    emit('update:description', editableDescription.value);
    vscode.postMessage({
      command: 'bruin.updateAsset',
      asset: assetData.value,
    });
  }
};

watch(() => props.name, (newName) => {
  editableName.value = newName;
});

watch(() => props.description, (newDescription) => {
  editableDescription.value = newDescription;
});
</script>
