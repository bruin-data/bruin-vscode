<template>
  <div class="flex flex-col space-y-6">
    <!-- Bruin CLI Section -->
    <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6">
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

    <!-- Connection Form Modal -->
    <div
      v-if="showForm"
      class="flex items-center justify-center z-50"
    >
      <div class="bg-editorWidget-bg p-6 rounded-lg max-w-2xl w-full">
        <ConnectionForm
          :connection="connectionToEdit"
          @submit="saveConnection"
          @cancel="cancelConnectionForm"
        />
      </div>
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
import { defineProps } from "vue";
import { ref } from "vue";
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

const showConnectionForm = (connection = null) => {
  connectionToEdit.value = connection || { name: "", type: "" };
  showForm.value = true;
};

const saveConnection = (connection) => {
  connectionsStore.saveConnection(connection);
  showForm.value = false;
};

const cancelConnectionForm = () => {
  showForm.value = false;
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
</script>
