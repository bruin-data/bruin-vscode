<template>
    <div
      v-if="warnings.length"
      class="rounded-md bg-yellow-50 p-4 my-4 overflow-hidden transition-all duration-300"
      :class="{ 'h-16': !isExpanded, 'max-h-64': isExpanded }"
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center flex-grow">
          <ExclamationTriangleIcon class="h-5 w-5 text-yellow-500 mr-2" aria-hidden="true" />
          <h3 class="text-lg font-medium text-yellow-800">Warnings</h3>
        </div>
        <div class="flex items-center">
          <button @click="toggleExpansion" class="text-yellow-500 mr-2">
            <ChevronDownIcon v-if="!isExpanded" class="h-5 w-5" aria-hidden="true" />
            <ChevronUpIcon v-else class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="isExpanded" class="mt-4 overflow-y-auto" style="max-height: 200px">
        <div v-for="(warning, index) in warnings" :key="index">
          <div class="mt-4">
            <div @click="toggleWarningExpansion(index)" class="flex items-center cursor-pointer">
              <ChevronRightIcon
                v-if="!warning.expanded"
                class="h-5 w-5 text-yellow-500"
                aria-hidden="true"
              />
              <ChevronDownIcon v-else class="h-5 w-5 text-yellow-500" aria-hidden="true" />
              <span class="ml-2 text-yellow-700">Pipeline: {{ warning.pipeline }}</span>
            </div>
          </div>
          <div v-if="warning.expanded" class="ml-5 mt-2">
            <div v-for="(issue, issueIndex) in Object.values(warning.issues).flat()" :key="issueIndex" class="mb-2">
              <h4 v-if="issue.asset" class="text-md font-semibold text-gray-900">
                Asset: {{ issue.asset }}
              </h4>
              <p class="text-sm text-yellow-600">{{ issue.description }}</p>
              <div v-if="issue.context && issue.context.length" class="flex items-center space-x-1 mt-2 justify-end">
                <button
                  @click="toggleIssueExpansion(index, issueIndex)"
                  class="text-xs text-yellow-700 flex items-center"
                >
                  <span class="mr-1">Details</span>
                  <ChevronUpIcon v-if="issue.expanded" class="h-4 w-4" aria-hidden="true" />
                  <ChevronDownIcon v-else class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div v-if="issue.expanded" class="text-sm text-gray-700 ml-1 mt-1 w-full">
                <pre class="whitespace-pre-wrap bg-yellow-100 rounded p-2">{{
                  formattedIssueContext(issue.context)
                }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from "vue";
  import {
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ExclamationTriangleIcon,
  } from "@heroicons/vue/20/solid";
  import type { FormattedErrorMessage } from "@/types";
  
  const props = defineProps<{
    warnings: FormattedErrorMessage[];
  }>();
  
  const isExpanded = ref(false);
  
  const formattedIssueContext = (context: string[]) => context.join("\n");
  
  const toggleExpansion = () => {
    isExpanded.value = !isExpanded.value;
  };
  
  const toggleWarningExpansion = (index: number) => {
    props.warnings[index].expanded = !props.warnings[index].expanded;
  };
  
  const toggleIssueExpansion = (warningIndex: number, issueIndex: number) => {
    const issues = Object.values(props.warnings[warningIndex].issues).flat();
    issues[issueIndex].expanded = !issues[issueIndex].expanded;
  };
  </script>