<template>
  <div class="inline-flex">
    <vscode-button 
      @click="$emit('mainClick')" 
      :disabled="disabled"
      class="text-xs h-7"
    >
      <div class="flex items-center justify-center">
        <component 
          v-if="icon" 
          :is="icon" 
          :class="iconClass" 
          aria-hidden="true" 
        />
        <span v-if="codicon" :class="codiconClass"></span>
        <span>{{ label }}</span>
      </div>
    </vscode-button>
    <Menu v-if="dropdownItems?.length" as="div" class="relative -ml-px block">
      <MenuButton
        :disabled="disabled"
        class="relative h-7 border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg px-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10"
      >
        <ChevronDownIcon class="h-3 w-3" aria-hidden="true" />
      </MenuButton>
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems
          class="absolute left-0 xs:right-0 xs:left-auto z-[99999] w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]"
        >
          <div class="p-1 bg-editorWidget-bg rounded-sm border border-commandCenter-border">
            <MenuItem 
              v-for="item in dropdownItems" 
              :key="item.key"
            >
              <vscode-button
                class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                @click="$emit('dropdownClick', item.key)"
              >
                {{ item.label }}
              </vscode-button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { ChevronDownIcon } from "@heroicons/vue/24/solid";

interface DropdownItem {
  key: string;
  label: string;
}

defineProps<{
  label: string;
  disabled?: boolean;
  icon?: any;
  iconClass?: string;
  codicon?: string;
  codiconClass?: string;
  dropdownItems?: DropdownItem[];
}>();

defineEmits<{
  mainClick: [];
  dropdownClick: [key: string];
}>();

</script>

<style scoped>
vscode-button::part(control) {
  @apply border-none px-1.5;
}
</style>