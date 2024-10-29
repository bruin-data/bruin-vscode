<template>
  <div class="flex flex-col items-start justify-between w-full">
    <div v-if="props !== null" class="flex flex-col text-editor-fg bg-editor-bg w-full">
      <div class="relative">
        <div
          ref="descriptionRef"
          class="text-xs text-editor-fg opacity-65 prose prose-sm max-w-none"
          :class="{ 'max-h-40 overflow-hidden': shouldTruncate && !isExpanded }"
          v-html="markdownDescription"
        ></div>

        <button
          v-if="shouldShowButton"
          @click="toggleExpand"
          class="flex items-center gap-2 mt-2 text-xs text-textLink-activeForeground hover:text-editorLink-activeForeground transition-colors"
        >
          <span>{{ isExpanded ? "Show Less" : "Show More" }}</span>
          <component
            :is="isExpanded ? ChevronUpIcon : ChevronDownIcon"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, watch, onMounted, nextTick } from "vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import MarkdownIt from "markdown-it";
import AssetGeneral from "./AssetGeneral.vue";
import { vscode } from "@/utilities/vscode";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/20/solid";

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

const descriptionRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const contentHeight = ref(0);
const maxHeight = 160; // 40px * 4 lines

// Update content height measurement
const updateContentHeight = async () => {
  await nextTick();
  if (descriptionRef.value) {
    contentHeight.value = descriptionRef.value.scrollHeight;
  }
};

// Check if content height exceeds max-height
const shouldTruncate = computed(() => {
  return contentHeight.value > maxHeight && props.description;
});

// Only show button if there's content that needs truncating
const shouldShowButton = computed(() => {
  return shouldTruncate.value;
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

onMounted(async () => {
  window.addEventListener("message", handleMessage);
  vscode.postMessage({ command: "bruin.getConnectionsList" });
  await updateContentHeight();

  // Add resize observer to handle dynamic content changes
  if (descriptionRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContentHeight();
    });
    resizeObserver.observe(descriptionRef.value);
  }
});

// Watch for description changes and update height
watch(
  () => props.description,
  async () => {
    await updateContentHeight();
  }
);

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "patch-message":
      console.log("Asset Details:", message.payload);
      break;
  }
};

const scheduleExists = computed(() => {
  return (
    props.pipeline.schedule !== "" &&
    props.pipeline.schedule !== "undefined" &&
    props.pipeline.schedule !== null &&
    props.pipeline.schedule !== undefined
  );
});

const md = new MarkdownIt();
const markdownDescription = computed(() => {
  if (!props.description) {
    return "No description available for this asset";
  }
  return md.render(props.description);
});

// State for description editing
const editableDescription = ref(props.description);

watch(
  () => props.description,
  (newDescription) => {
    editableDescription.value = newDescription;
  }
);
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
</style>
