<template>
    <div
      v-if="formattedWarningMessages.length"
      class="rounded-md bg-amber-50 p-3 my-2 transition-all duration-300"
      :class="{ 'h-12 overflow-hidden': !isOverallExpanded }"
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center flex-grow">
          <ExclamationTriangleIcon class="h-4 w-4 text-amber-400 mr-2" aria-hidden="true" />
          <h3 class="text-sm font-medium text-amber-700">Warnings</h3>
        </div>
        <div class="flex items-center">
          <button @click="toggleOverallExpansion" class="text-amber-400 hover:text-amber-500 mr-1">
            <component :is="isOverallExpanded ? ChevronUpIcon : ChevronDownIcon" class="h-4 w-4" aria-hidden="true" />
          </button>
          <button @click="$emit('warningClose')" class="text-amber-400 hover:text-amber-500">
            <XMarkIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="isOverallExpanded" class="mt-2 overflow-y-auto" style="max-height: 250px">
        <div v-for="(warning, index) in formattedWarningMessages" :key="index">
          <div class="mt-2">
            <div @click="toggleWarningExpansion(index)" class="flex items-center cursor-pointer">
              <component :is="expandedWarnings[index] ? ChevronDownIcon : ChevronRightIcon" class="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span class="ml-1 text-xs text-amber-600">Pipeline: {{ warning.pipeline }}</span>
            </div>
          </div>
          <div v-if="expandedWarnings[index]" class="ml-4 mt-1">
            <div
              v-for="(issue, issueIndex) in warning.issues"
              :key="issueIndex"
              class="mb-1"
            >
              <h4 v-if="issue.asset" class="text-xs font-medium text-gray-600">
                Asset: {{ issue.asset }}
              </h4>
              <p class="text-xs text-amber-600">{{ issue.description }}</p>
              <div
                v-if="issue.context && issue.context.length"
                class="flex items-center space-x-1 mt-1 justify-end"
              >
                <button
                  @click="toggleIssueExpansion(index, issueIndex)"
                  class="text-xs text-amber-500 hover:text-amber-600 flex items-center"
                >
                  <span class="mr-1">Details</span>
                  <component :is="expandedIssues[index]?.[issueIndex] ? ChevronUpIcon : ChevronDownIcon" class="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              <div v-if="expandedIssues[index]?.[issueIndex]" class="text-xs text-gray-600 mt-1 w-full">
                <pre class="whitespace-pre-wrap bg-amber-100 rounded p-2">{{ issue.context.join('\n') }}</pre>
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