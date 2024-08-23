<template>
  <div class="relative w-full flex flex-col">
    <!-- Mode toggle buttons -->
    <div class="absolute top-0 right-0 flex space-x-2 z-10">
      <button
        @click="toggleEditMode"
        :class="isEditMode ? 'text-editor-button-hover-fg' : 'text-editor-button-fg'"
        title="Edit mode"
      >
        <PencilIcon class="h-5 w-5" />
      </button>
      <button
        @click="toggleViewMode"
        :class="isEditMode ? 'text-editor-button-fg' : 'text-editor-button-hover-fg'"
        title="View mode"
      >
        <EyeIcon class="h-5 w-5" />
      </button>
    </div>

    <template v-if="!isEditMode">
      <!-- View Mode -->
      <!-- Name and badges -->
      <div class="flex items-center justify-between w-full mt-2 pt-4">
        <div class="flex items-center space-x-2 font-md text-editor-fg text-lg font-mono">
          {{ name }}
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
      <DescriptionItem
        v-if="ownerExists"
        :value="owner"
        className="font-semibold text-editor-fg opacity-30 mb-2"
      />

      <div
        v-if="markdownDescription"
        class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4"
        v-html="markdownDescription"
      ></div>
      <p v-else class="text-sm text-editor-fg opacity-50 pt-4">
        No description available for this asset.
      </p>

      <vscode-divider class="border-t border-editor-border opacity-20 my-4"></vscode-divider>

      <!-- Displaying other details in view mode -->
      <AssetGeneral
        :schedule="scheduleExists ? pipeline.schedule : ''"
        :environments="environments"
        :selectedEnvironment="selectedEnvironment"
      />
    </template>

    <!-- Edit Mode -->
    <AssetEditSection
      v-else
      :asset="assetData"
      @save="handleSave"
      @cancel="toggleViewMode"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import AssetGeneral from "./AssetGeneral.vue";
import AssetEditSection from "./AssetEditSection.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";
import MarkdownIt from "markdown-it";
import { PencilIcon, EyeIcon } from "@heroicons/vue/24/outline";
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

const emit = defineEmits(["update:name", "update:description", "update:type", "update:owner", "update:pipeline", "update:columns", "update:checks"]);

const isEditMode = ref(false);

const assetData = computed(() => ({
  name: props.name,
  description: props.description,
  type: props.type,
  owner: props.owner,
  pipeline: props.pipeline,
  columns: props.columns,
  checks: props.checks,
  materialization: { type: 'table' }, // Add this if it's not in the props
}));

const ownerExists = computed(() => props.owner && props.owner !== "undefined");
const scheduleExists = computed(
  () => props.pipeline.schedule && props.pipeline.schedule !== "undefined"
);

const md = new MarkdownIt();
const markdownDescription = computed(() =>
  props.description ? md.render(props.description) : null
);

const toggleEditMode = () => {
  isEditMode.value = true;
};

const toggleViewMode = () => {
  isEditMode.value = false;
};

const badgeClass = computed(() => {
  const commonStyle =
    "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";
  const styleForType = badgeStyles[props.type] || defaultBadgeStyle;
  return {
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle} ${styleForType.main}`,
  };
});

const handleSave = (updatedAsset) => {
  emit("update:name", updatedAsset.name);
  emit("update:description", updatedAsset.description);
  emit("update:type", updatedAsset.type);
  emit("update:owner", updatedAsset.owner);
  emit("update:pipeline", updatedAsset.pipeline);
  emit("update:columns", updatedAsset.columns);
  emit("update:checks", updatedAsset.checks);

  vscode.postMessage({
    command: "bruin.updateAsset",
    asset: updatedAsset,
  });
  toggleViewMode();
};
</script>