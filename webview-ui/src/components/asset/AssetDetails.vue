<template>
  <div class="flex flex-col items-start justify-between w-full">
    <div class="w-full">
      <div class="flex items-center space-x-2 w-full justify-between">
        <!-- Name editing -->
        <div
          v-if="!editingName"
          class="font-md text-editor-fg text-lg font-mono cursor-pointer truncate max-w-[70%]"
          @click="editName"
        >
          {{ editableName }}
        </div>
        <input
          v-else
          v-model="editableName"
          @blur="saveName"
          @keyup.enter="saveName"
          class="font-md text-editor-fg text-lg font-mono bg-transparent border-none focus:outline-none border-b border-editor-border max-w-[70%]"
          autofocus
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
        <div
          v-if="!editingDescription"
          class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4 cursor-pointer"
          v-html="markdownDescription"
          @click="editDescription"
        ></div>
        <textarea
          v-else
          v-model="editableDescription"
          @blur="saveDescription"
          @keyup.enter="saveDescription"
          class="text-sm text-editor-fg opacity-65 prose prose-sm pt-4 bg-transparent border-none focus:outline-none w-full"
          rows="4"
          autofocus
        ></textarea>
      </div>
    </div>

    <div class="flex" v-else>
      <MessageAlert message="This file is either not a Bruin Asset or has no data to display." />
    </div>

    <vscode-divider class="border-t border-editor-border opacity-20 my-4"></vscode-divider>

    <div class="w-full">
      <AssetGeneral
        :schedule="scheduleExists ? props.pipeline.schedule : ''"
        :environments="environments"
        :selectedEnvironment="selectedEnvironment"
      />
    </div>

    <div class="mt-4">
      <button @click="setAssetValues" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Set Asset Values
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, watch, onMounted } from "vue";
import DescriptionItem from "@/components/ui/description-item/DescriptionItem.vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { badgeStyles, defaultBadgeStyle } from "@/components/ui/badges/CustomBadgesStyle";
import MarkdownIt from "markdown-it";
import AssetGeneral from "./AssetGeneral.vue";
import { useAssetStore } from "@/store/bruinStore";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  owner: string;
  id: string;
  pipeline: any;
  environments: string[];
  selectedEnvironment: string;
  filePath: string;
}>();


onMounted(() => {
  window.addEventListener("message", handleMessage);
  vscode.postMessage({ command: "bruin.getConnectionsList" });
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "patch-message":
      console.log("Asset Details:", message.payload);
      break;
  }
};


const assetStore = useAssetStore();

const ownerExists = computed(() => {
  return props.owner !== "" && props.owner !== "undefined" && props.owner !== null && props.owner !== undefined;
});

const scheduleExists = computed(() => {
  return props.pipeline.schedule !== "" && props.pipeline.schedule !== "undefined" && props.pipeline.schedule !== null && props.pipeline.schedule !== undefined;
});

const md = new MarkdownIt();
const markdownDescription = computed(() => {
  if (!props.description) {
    return " No description available for this asset";
  }
  return md.render(props.description);
});

// State for name editing
const editingName = ref(false);
const editableName = ref(props.name);

const editName = () => {
  editingName.value = true;
};

const saveName = async () => {
  editingName.value = false;
  if (editableName.value !== props.name) {
    try {
      console.log("Editable Name:", editableName.value);
      await assetStore.updateAssetDetails({ ...props, name: editableName.value });
      await vscode.postMessage({ command: "bruin.setAssetDetails", payload: { "name": editableName.value } });
    } catch (error) {
      console.error("Error updating asset name:", error);
    }
  }
};

// State for description editing
const editingDescription = ref(false);
const editableDescription = ref(props.description);

const editDescription = () => {
  editingDescription.value = true;
};

const saveDescription = async () => {
  editingDescription.value = false;
  if (editableDescription.value !== props.description) {
    try {
      console.log("Editable Description:", editableDescription.value);
      await assetStore.updateAssetDetails({ ...props, description: editableDescription.value });
      await vscode.postMessage({ command: "bruin.setAssetDetails", payload: { description: editableDescription.value } });
    } catch (error) {
      console.error("Error updating asset description:", error);
    }
  }
};

const badgeClass = computed(() => {
  const commonStyle = "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";
  const styleForType = badgeStyles[props.type] || defaultBadgeStyle;
  return {
    commonStyle: commonStyle,
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle} ${styleForType.main}`,
  };
});

watch(() => props.name, (newName) => {
  editableName.value = newName;
});

watch(() => props.description, (newDescription) => {
  editableDescription.value = newDescription;
});

const setAssetValues = async () => {
  try {
    await vscode.postMessage({ command: "bruin.setAssetDetails", payload: {...props, name: editableName.value, description:editableDescription.value } });
    // Update the store after successful execution
    await assetStore.updateAssetDetails({ ...props, name: editableName.value, description:editableDescription.value});
  } catch (error) {
    console.error("Error setting asset values:", error);
  }
};
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
</style>