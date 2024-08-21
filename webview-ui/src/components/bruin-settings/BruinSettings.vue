<template>
  <div class="flex flex-col space-y-6">
    <!-- Bruin CLI Section -->
    <div>
      <BruinCLI />
    </div>

    <!-- Connections Section -->
    <div class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList
        v-if="props.isBruinInstalled"
        @new-connection="showConnectionForm"
        @edit-connection="showConnectionForm"
        @delete-connection="confirmDeleteConnection"
      />
    </div>

      <div v-if="showForm" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6">
        <ConnectionForm
          :connection="connectionToEdit"
          @submit="saveConnection"
          @cancel="cancelConnectionForm"
        />
      </div>

    <!-- Delete Confirmation Modal -->
    <DeleteAlert
      v-if="showDeleteAlert"
      :connectionName="connectionToDelete?.name"
      @confirm="deleteConnection"
      @cancel="cancelDeleteConnection"
    />
  </div>
</template>

<script setup>
import BruinCLI from "@/components/bruin-settings/BruinCLI.vue";
import ConnectionsList from "@/components/connections/ConnectionList.vue";
import ConnectionForm from "@/components/connections/ConnectionsForm.vue";
import { ref, defineProps, onMounted } from "vue";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { useConnectionsStore } from "@/store/connections";

const props = defineProps({
  isBruinInstalled: Boolean,
});

const showForm = ref(false);
const connectionToEdit = ref(null);
const showDeleteAlert = ref(false);
const connectionToDelete = ref(null);
const connectionsStore = useConnectionsStore();

onMounted(() => {
  connectionsStore.loadConnections();
});

const showConnectionForm = (connection = null) => {
  connectionToEdit.value = connection || { name: "", type: "" };
  showForm.value = true;
};

const saveConnection = (connection) => {
  const existingIndex = connectionsStore.connections.findIndex(
    (c) => c.name === connectionToEdit.value.name
  );
  if (existingIndex === -1) {
    connectionsStore.saveConnection(connection);
    prepareCliPayload(connection);
  } else {
    connectionsStore.updateConnection(existingIndex, connection);
    prepareCliPayload(connection);
  }
  showForm.value = false;
  connectionToEdit.value = null;
};

const cancelConnectionForm = () => {
  showForm.value = false;
  connectionToEdit.value = null;
};

const confirmDeleteConnection = (connection) => {
  connectionToDelete.value = connection;
  showDeleteAlert.value = true;
};

const deleteConnection = () => {
  connectionsStore.deleteConnection(connectionToDelete.value);
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};

const cancelDeleteConnection = () => {
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};

const prepareCliPayload = (connection) => {
  const cliPayload = `${connection.name} ${connection.type} '${JSON.stringify(connection)}'`;
  console.log('CLI Payload:', cliPayload);
};

</script>