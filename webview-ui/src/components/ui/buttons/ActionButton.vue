<template>
  <div :class="`relative text-left ${bgColor}`">
    <!-- Button part -->
    <button
      @click="defaultAction"
      :class="`flex items-stretch justify-between text-sm font-medium leading-5 
                text-[color:var(--vscode-editor-forground)] transition duration-150 ease-in-out border rounded-md 
                disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring focus:ring-offset-2 focus:ring-offset-[color:var(--vscode-editor-background)]
  
                  ${btnClasses}`"
      :disabled="props.isDisabled"
    >
      <!-- Status icons and button label -->
      <button
        class="flex items-center gap-x-2 px-4 py-2
        focus:rounded-md focus:text-[color:var(--vscode-editor-forground)] 
        focus:bg-editor-bg hover:bg-editor-fg 
        hover:opacity-75 
        hover:text-[color:var(--vscode-editor-background)]"
      >
        <template v-if="status">
          <CheckCircleIcon
            v-if="status === 'validated'"
            class="h-5 w-5 text-green-400"
            aria-hidden="true"
          />
          <XCircleIcon
            v-if="status === 'failed'"
            class="h-5 w-5 text-[#f48771]"
            aria-hidden="true"
          />
          <span v-if="status === 'loading'" class="spinner"></span>
        </template>
        {{ buttonLabel }}
      </button>
      <!-- Dropdown control -->
      <div id="menu" class="m-0 p-0">
        <button
          class="h-full p-0 w-6 flex items-center justify-center hover:bg-editor-fg hover:opacity-75 hover:text-[color:var(--vscode-editor-background)]"
          @click.stop="toggleDropdown"
          :disabled="props.isDisabled"
        >
          <ChevronDownIcon class="w-5 h-full" />
        </button>
      </div>
    </button>
    <!-- Dropdown menu -->
    <div
      v-if="isOpen"
      class="absolute right-0 z-50 w-56 mt-2 origin-top-right bg-editor-fg border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none"
    >
      <div class="py-1">
        <button
          v-for="(item, index) in menuItems"
          :key="index"
          @click="selectAction(item)"
          class="block w-full px-4 py-2 text-sm text-left text-[color:var(--vscode-editor-background)] hover:text-[color:var(--vscode-editor-background)] hover:bg-menu-hoverBackground focus:outline-none "
        >
          {{ item }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, onMounted, onUnmounted } from "vue";
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  buttonLabel: string;
  btnClasses?: string;
  isDisabled: boolean;
  bgColor?: string | null;
  status?: "validated" | "failed" | "loading" | null;
  menuItems?: string[];
  defaultAction: () => void;
}>();

const isOpen = ref(false);
const dropdownContainer = ref<HTMLElement | null>(null);

function toggleDropdown(event: { stopPropagation: () => void }) {
  isOpen.value = !isOpen.value;
  event.stopPropagation();
}

const emit = defineEmits(["execChoice"]);
function selectAction(action: string) {
  emit("execChoice", action);
  isOpen.value = false;
  console.log(`Action selected: ${action}`);
}

function handleClickOutside(event) {
  if (event.target == dropdownContainer.value || dropdownContainer.value == event.target.parentNode)
    return;
  isOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
