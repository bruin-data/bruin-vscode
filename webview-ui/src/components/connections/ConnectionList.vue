<template>
  <div class="max-w-7xl mx-auto p-4">
    <div class="flex-col items-center">
      <div class="flex flex-col items-start space-y-2 mb-2">
        <h2 class="text-xl font-semibold text-editor-fg">Connections</h2>
        <div v-if="!error" class="mt-2 max-w-xl text-sm text-editor-fg">
          <p>
            Manage your connections across different environments all in one place. View existing
            connections, edit their details, or delete them as needed.
          </p>
        </div>
      </div>
      <div class="flex items-center justify-end">
        <vscode-button
          @click="$emit('new-connection')"
          class="mt-2 rounded-md px-1 py-2 text-sm font-semibold"
        >
          New connection
        </vscode-button>
      </div>
    </div>

    <div v-if="error">
      <AlertMessage :message="error" />
    </div>
    <div
      v-else
      v-for="(connections, environment) in groupedConnections"
      :key="environment"
      class="mt-6"
    >
      <h3 class="text-lg font-medium text-editor-fg mb-2 font-mono">{{ environment }}</h3>
      <div class="overflow-hidden bg-editorWidget-bg sm:rounded-lg">
        <table class="min-w-full divide-y divide-commandCenter-border">
          <thead>
            <tr>
              <th
                scope="col"
                class="w-2/5 px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
              >
                Name
              </th>
              <th
                scope="col"
                class="w-2/5 px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
              >
                Type
              </th>
              <th
                scope="col"
                class="w-1/5 px-2 py-2 text-right text-sm font-semibold text-editor-fg opacity-70"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="connection in connections"
              :key="connection.name"
              class="hover:bg-editor-hoverBackground"
            >
              <td
                class="w-2/5 whitespace-nowrap px-2 py-2 text-sm font-medium text-editor-fg font-mono"
                :class="{ 'opacity-80 italic': !connection.name }"
              >
                {{ connection.name || "undefined" }}
              </td>
              <td class="w-2/5 whitespace-nowrap px-2 py-2 text-sm text-descriptionFg font-mono">
                {{ connection.type }}
              </td>
              <td class="w-1/5 whitespace-nowrap px-2 py-2 text-right text-sm font-medium">
                <button
                  @click="$emit('duplicate-connection', connection)"
                  class="text-descriptionFg hover:text-editor-fg mr-3"
                  title="Duplicate"
                >
                <DocumentDuplicateIcon class="h-5 w-5 inline-block" />
                </button>
                <button
                  @click="$emit('edit-connection', connection)"
                  class="text-descriptionFg hover:text-editor-fg mr-3"
                  title="Edit"
                >
                  <PencilIcon class="h-5 w-5 inline-block" />
                </button>
                <button
                  @click="
                    $emit('delete-connection', { name: connection.name, environment: environment })
                  "
                  class="text-descriptionFg opacity-70 hover:text-editorError-foreground"
                  title="Delete"
                >
                  <TrashIcon class="h-5 w-5 inline-block" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useConnectionsStore } from "@/store/connections";
import { computed } from "vue";
import { TrashIcon, PencilIcon, DocumentDuplicateIcon } from "@heroicons/vue/24/outline";
import AlertMessage from "@/components/ui/alerts/AlertMessage.vue";

const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);

const groupedConnections = computed(() => {
  return connections.value.reduce((grouped, connection) => {
    const { environment } = connection;
    (grouped[environment] = grouped[environment] || []).push(connection);
    return grouped;
  }, {});
});

defineEmits(["new-connection", "edit-connection", "delete-connection", "duplicate-connection"]);
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
.divide-y-opacity {
  border: 0.5;
}
</style>
