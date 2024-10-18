<template>
    <div
      v-if="formattedWarningMessages.length"
      class="rounded-md bg-yellow-50 p-4 my-4 overflow-hidden transition-all duration-300"
      :class="{ 'h-16': !isOverallExpanded, 'max-h-64': isOverallExpanded }"
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center flex-grow">
          <ExclamationTriangleIcon class="h-5 w-5 text-yellow-500 mr-2" aria-hidden="true" />
          <h3 class="text-lg font-medium text-yellow-800">Warnings</h3>
        </div>
        <div class="flex items-center">
          <button @click="toggleOverallExpansion" class="text-yellow-500 mr-2">
            <component :is="isOverallExpanded ? ChevronUpIcon : ChevronDownIcon" class="h-5 w-5" aria-hidden="true" />
          </button>
          <button @click="$emit('warningClose')" class="text-yellow-700">
            <XMarkIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="isOverallExpanded" class="mt-4 overflow-y-auto" style="max-height: 200px">
        <div v-for="(warning, index) in formattedWarningMessages" :key="index">
          <div class="mt-4">
            <div @click="toggleWarningExpansion(index)" class="flex items-center cursor-pointer">
              <component :is="expandedWarnings[index] ? ChevronDownIcon : ChevronRightIcon" class="h-5 w-5 text-yellow-500" aria-hidden="true" />
              <span class="ml-2 text-yellow-700">Pipeline: {{ warning.pipeline }}</span>
            </div>
          </div>
          <div v-if="expandedWarnings[index]" class="ml-5 mt-2">
            <div
              v-for="(issue, issueIndex) in warning.issues"
              :key="issueIndex"
              class="mb-2"
            >
              <h4 v-if="issue.asset" class="text-md font-semibold text-gray-900">
                Asset: {{ issue.asset }}
              </h4>
              <p class="text-sm text-yellow-600">{{ issue.description }}</p>
              <div
                v-if="issue.context && issue.context.length"
                class="flex items-center space-x-1 mt-2 justify-end"
              >
                <button
                  @click="toggleIssueExpansion(index, issueIndex)"
                  class="text-xs text-yellow-700 flex items-center"
                >
                  <span class="mr-1">Details</span>
                  <component :is="expandedIssues[index]?.[issueIndex] ? ChevronUpIcon : ChevronDownIcon" class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div v-if="expandedIssues[index]?.[issueIndex]" class="text-sm text-gray-700 ml-1 mt-1 w-full">
                <pre class="whitespace-pre-wrap bg-yellow-100 rounded p-2">{{ issue.context.join('\n') }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from "vue";
  import {
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
  } from "@heroicons/vue/20/solid";
  import type { FormattedErrorMessage, Issue } from "@/types";
  
  const props = defineProps<{
    warnings: FormattedErrorMessage[];
  }>();
  
  const emit = defineEmits(['warningClose']);
  
  const isOverallExpanded = ref(false);
  const expandedWarnings = ref<boolean[]>([]);
  const expandedIssues = ref<boolean[][]>([]);
  
  const formattedWarningMessages = computed(() => {
    if (!props.warnings) return [];
    try {
      const formatted = props.warnings.map((warning) => ({
        ...warning,
        issues: Object.values(warning.issues)
          .flat()
          .filter((issue: Issue) => issue.severity === "warning"),
      }));
      
      // Initialize expansion states
      expandedWarnings.value = new Array(formatted.length).fill(false);
      expandedIssues.value = formatted.map(warning => new Array(warning.issues.length).fill(false));
      
      return formatted;
    } catch (error) {
      console.error("Error parsing warnings", error);
      return [];
    }
  });
  
  const toggleOverallExpansion = () => {
    isOverallExpanded.value = !isOverallExpanded.value;
  };
  
  const toggleWarningExpansion = (index: number) => {
    expandedWarnings.value[index] = !expandedWarnings.value[index];
  };
  
  const toggleIssueExpansion = (warningIndex: number, issueIndex: number) => {
    expandedIssues.value[warningIndex][issueIndex] = !expandedIssues.value[warningIndex][issueIndex];
  };
  </script>
  
  <style scoped>
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
  }
  </style>