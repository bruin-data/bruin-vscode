<template>
  <div v-if="formattedErrorMessage" class="rounded-md bg-red-50 p-4 my-4">
    <div class="flex">
      <div class="flex-shrink-0">
        <XCircleIcon class="h-5 w-5 text-red-500" aria-hidden="true" />
      </div>
      <div class="ml-4">
        <h3 class="text-lg font-medium text-red-800" v-if="formattedErrorMessage.pipeline">
          Pipeline: {{ formattedErrorMessage.pipeline }}
        </h3>
        <div v-for="(issue, index) in formattedErrorMessage.issues" :key="index" class="mt-3">
          <h4 class="text-md font-semibold text-gray-900" v-if="issue.asset">
            Asset: {{ issue.asset }}
          </h4>
          <p class="text-sm text-red-600">{{ issue.description }}</p>
          <div
            v-if="issue.context.length"
            class="flex items-center space-x-1 mt-2 justify-end text-[color:var(--vscode-editor-background)]"
          >
            <span class="font-semibold"> Details </span>
            <transition name="fade">
              <ChevronUpIcon
                v-if="issue.expanded.value"
                class="h-5 w-5"
                aria-hidden="true"
                @click="issue.expanded.value = !issue.expanded.value"
              />
              <ChevronDownIcon
                v-else
                class="h-5 w-5"
                aria-hidden="true"
                @click="issue.expanded.value = !issue.expanded.value"
              />
            </transition>
          </div>
          <div class="text-sm text-gray-700 ml-1 mt-1" v-show="issue.expanded.value">
            <pre class="whitespace-pre-wrap bg-red-100 rounded p-2">{{
              formattedIssueContext(issue.context)
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, ref } from "vue";
import { defineProps } from "vue";
import { XCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/20/solid";
import type {ParsedValidationErrorMessage} from "@/types";

const props = defineProps<{
  errorMessage: string | any | null;
}>();

// Helper function to format issue context
const formattedIssueContext = (context) => {
  return context.join("\n");
};


const formattedErrorMessage = computed(() => {
  if (!props.errorMessage) return null;


  try {

    
    const errorObject = JSON.parse(props.errorMessage) 
    
    const validationError = errorObject[0] as ParsedValidationErrorMessage;

    // Handling a simple error message
    if (errorObject.error) {
      console.log("Error message:", errorObject.error);
      return {
        pipeline: null, // Set to null or a default message
        issues: [{
          asset: null, // Asset can be null
          description: errorObject.error, // Ensure description is always populated
          context: [],
          expanded: ref(false),
        }]
      };
    }

    // Handling structured error messages
    if (validationError.pipeline || validationError.issues) {
      return {
        pipeline: validationError.pipeline || null,
        issues: Object.entries(validationError.issues || {}) 
          .map(([test, issues]) => {
            return issues.map((issue) => ({
              asset: issue.asset || null,
              description: issue.description, // Description is expected to be always available
              context: issue.context || [],
              expanded: ref(false),
            }));
          })
          .flat(),
      };
    }

    return null;
  } catch (e) {
    console.error("Failed to parse error message:", e);
    return null;
  }
});
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>