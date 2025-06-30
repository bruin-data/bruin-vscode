<template>
  <div class="flex flex-col items-start justify-between w-full">
    <div v-if="props !== null" class="flex flex-col text-editor-fg bg-editor-bg w-full">
      <div class="relative">
        <div
          @mouseenter="showEditButton = true"
          @mouseleave="handleMouseLeave"
          :class="{ 'max-h-40 overflow-hidden': shouldTruncate && !isExpanded }"
        >
          <div
            v-if="!isEditingDescription"
            ref="descriptionRef"
            id="asset-description-container"
            class="text-xs text-editor-fg opacity-65 prose prose-sm max-w-none"
            :class="{ 'max-h-40 overflow-hidden': shouldTruncate && !isExpanded }"
            v-html="markdownDescription"
          ></div>

          <vscode-button
            v-if="!isEditingDescription && showEditButton"
            id="description-edit"
            appearance="icon"
            @click.stop="startEditingDescription"
            class="absolute top-0 right-0 mt-1 mr-1"
          >
            <PencilIcon class="h-4 w-4" aria-hidden="true" />
          </vscode-button>

          <div v-if="isEditingDescription" class="relative">
            <textarea
              id="description-input"
              v-model="editableDescription"
              class="description-input w-full h-40 bg-input-background border border-editor-border rounded p-2 pr-16 text-input-foreground text-xs"
              ref="descriptionInput"
              :class="{ 'truncate-description': shouldTruncate && !isExpanded }"
            ></textarea>
            <div class="absolute top-2 right-2 flex gap-0.5">
              <vscode-button 
                title="cancel" 
                appearance="icon" 
                @click.stop="cancelDescriptionEdit"
                class="opacity-80 hover:opacity-100 transition-opacity"
              >
                <XIcon class="h-4 w-4" aria-hidden="true" />
              </vscode-button>
              <vscode-button 
                title="save" 
                appearance="icon" 
                @click.stop="saveDescriptionEdit"
                class="opacity-80 hover:opacity-100 transition-opacity"
              >
                <CheckIcon class="h-4 w-4" aria-hidden="true" />
              </vscode-button>
            </div>
          </div>
        </div>

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
        :hasIntervalModifiers="hasIntervalModifiers"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import MarkdownIt from "markdown-it";
import AssetGeneral from "./AssetGeneral.vue";
import { vscode } from "@/utilities/vscode";
import { ChevronDownIcon, ChevronUpIcon, PencilIcon } from "@heroicons/vue/20/solid";
import { CheckIcon, XIcon } from "lucide-vue-next";

const props = defineProps<{
  name: string;
  description: string;
  type: string;
  owner: string;
  id: string;
  pipeline: any;
  environments: string[];
  selectedEnvironment: string;
  hasIntervalModifiers: boolean;
}>();

const descriptionRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const contentHeight = ref(0);
const maxHeight = 160;
const editableDescription = ref(props.description);
const isEditingDescription = ref(false);
const showEditButton = ref(false);
const descriptionInput = ref<HTMLTextAreaElement | null>(null);

const updateContentHeight = async () => {
  await nextTick();
  if (descriptionRef.value) {
    contentHeight.value = descriptionRef.value.scrollHeight;
  }
};

const shouldTruncate = computed(() => {
  return contentHeight.value > maxHeight && props.description;
});

const shouldShowButton = computed(() => {
  return shouldTruncate.value;
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

onMounted(async () => {
  window.addEventListener("message", handleMessage);
  await updateContentHeight();

  if (descriptionRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContentHeight();
    });
    resizeObserver.observe(descriptionRef.value);
  }
});
const handleClickOutside = (event: MouseEvent) => {
  if (descriptionInput.value && !descriptionInput.value.contains(event.target as Node)) {
    cancelDescriptionEdit();
    document.removeEventListener("click", handleClickOutside);
  }
}
const startEditingDescription = () => {
  isEditingDescription.value = true;
  showEditButton.value = false;
  editableDescription.value = props.description; // Reset to original value when starting edit
  nextTick(() => {
    descriptionInput.value?.focus();
  });
  document.addEventListener("click", handleClickOutside);
};

const emit = defineEmits(["update:description"]);

const saveDescriptionEdit = () => {
  try {
    // Ensure we have a string and normalize it
    const normalizedDescription = String(editableDescription.value || '').trim();
    // Only emit if there's an actual change
    if (normalizedDescription !== props.description) {
      emit("update:description", normalizedDescription);
    }
  } catch (error) {
    console.error("Error saving description:", error);
  } finally {
    isEditingDescription.value = false;
    showEditButton.value = false;
  }
};

const cancelDescriptionEdit = () => {
  editableDescription.value = props.description; // Reset to original value
  isEditingDescription.value = false;
  showEditButton.value = false;
  document.removeEventListener("click", handleClickOutside);
};

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

watch(
  () => props.description,
  (newDescription) => {
    editableDescription.value = newDescription;
  }
);

const handleMouseLeave = () => {
  if (!isEditingDescription.value) {
    showEditButton.value = false;
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
