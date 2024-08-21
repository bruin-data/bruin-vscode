<template>
  <div class="flex flex-col justify-center">
    <header
      class="flex bg-editorWidget-bg shadow w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 sm:rounded-lg items-center justify-between mb-2"
    >
      <h2 class="text-base font-semibold leading-7 text-editor-fg">Connections</h2>
      <vscode-button
        @click="$emit('new-connection')"
        class="rounded-md px-4 py-2 font-semibold"
      >
        New connection
      </vscode-button>
    </header>
    <div class="bg-editorWidget-bg shadow sm:rounded-lg px-4 sm:px-6">
      <table class="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-editor-fg sm:pl-0"
            >
              Name
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-editor-fg">
              Type
            </th>
            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-editorInlayHint-fg">
          <tr v-for="connection in connections" :key="connection.name">
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-editor-fg sm:pl-0">
              {{ connection.name }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-descriptionFg">
              {{ connection.type }}
            </td>
            <td
              class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0"
            >
              <button
                @click="$emit('edit-connection', connection)"
                class="text-descriptionFg hover:text-editor-fg mr-2"
              >
                <PencilIcon class="h-5 w-5" />
              </button>
              <button
                @click="$emit('delete-connection', connection)"
                class="text-errorForeground hover:text-editorError-foreground"
              >
                <TrashIcon class="h-5 w-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { TrashIcon, PencilIcon } from "@heroicons/vue/24/outline";
import { useConnectionsStore } from "@/store/connections";


const connectionsStore = useConnectionsStore();
const connections = connectionsStore.connections;

defineEmits(['new-connection', 'edit-connection', 'delete-connection']);
</script>