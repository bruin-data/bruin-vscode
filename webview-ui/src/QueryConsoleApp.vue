<template>
  <div class="query-console">
    <!-- Connection and Environment Selectors -->
    <div class="console-header">
      <div class="selector-row">
        <div class="selector-group">
          <label class="selector-label">Connection</label>
          <vscode-dropdown
            v-model="selectedConnection"
            @change="onConnectionChange"
            class="connection-dropdown"
          >
            <vscode-option value="">Select connection...</vscode-option>
            <vscode-option
              v-for="conn in connections"
              :key="`${conn.name}-${conn.environment}`"
              :value="conn.name"
            >
              {{ conn.name }} ({{ conn.environment || 'default' }})
            </vscode-option>
          </vscode-dropdown>
        </div>
        <div class="selector-group limit-group">
          <label class="selector-label">Limit</label>
          <vscode-text-field
            v-model="limit"
            type="number"
            min="1"
            max="50000"
            class="limit-input"
            placeholder="1000"
          />
        </div>
      </div>
    </div>

    <!-- Query Editor Area -->
    <div class="editor-container">
      <div class="editor-header">
        <span class="editor-title">SQL Query</span>
        <div class="editor-actions">
          <vscode-button
            appearance="icon"
            title="Clear query"
            @click="clearQuery"
            :disabled="!query.trim()"
          >
            <span class="codicon codicon-clear-all"></span>
          </vscode-button>
        </div>
      </div>
      <textarea
        ref="queryEditor"
        v-model="query"
        class="query-editor"
        placeholder="Enter your SQL query here...

Click the arrow icon on any table in the Databases panel to insert it."
        @keydown="handleKeydown"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Action Buttons -->
    <div class="action-bar">
      <vscode-button
        @click="executeQuery"
        :disabled="!canExecute"
        class="text-xs h-7"
      >
        <div class="flex items-center justify-center gap-1">
          <span class="codicon codicon-play"></span>
          <span>Run</span>
        </div>
      </vscode-button>
      <span class="keyboard-hint">
        <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Enter</kbd>
      </span>
    </div>

    <!-- Status/Error Messages -->
    <div v-if="statusMessage" class="status-message" :class="statusMessage.type">
      <span :class="statusMessage.type === 'error' ? 'codicon codicon-error' : 'codicon codicon-check'"></span>
      {{ statusMessage.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { vscode } from "./utilities/vscode";

// State
const query = ref("");
const selectedConnection = ref("");
const limit = ref("1000");
const connections = ref<Array<{ name: string; type: string; environment?: string }>>([]);
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const queryEditor = ref<HTMLTextAreaElement | null>(null);

// Computed
const isMac = computed(() => navigator.platform.toUpperCase().indexOf("MAC") >= 0);

const canExecute = computed(() => {
  return query.value.trim() && selectedConnection.value;
});

// Methods
const executeQuery = () => {
  if (!canExecute.value) return;

  statusMessage.value = null;

  vscode.postMessage({
    command: "executeQuery",
    query: query.value,
    connectionName: selectedConnection.value,
    environment: getSelectedEnvironment(),
    limit: limit.value || "1000",
  });

  saveState();
};

const clearQuery = () => {
  query.value = "";
  statusMessage.value = null;
  saveState();
};

const getSelectedEnvironment = (): string => {
  const conn = connections.value.find((c) => c.name === selectedConnection.value);
  return conn?.environment || "";
};

const handleKeydown = (event: KeyboardEvent) => {
  // Cmd/Ctrl + Enter to execute
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    executeQuery();
  }
};

const onConnectionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedConnection.value = target.value;
  saveState();
};

const insertTextAtCursor = (text: string) => {
  if (!queryEditor.value) return;

  const start = queryEditor.value.selectionStart;
  const end = queryEditor.value.selectionEnd;
  const before = query.value.substring(0, start);
  const after = query.value.substring(end);

  query.value = before + text + after;

  const newPos = start + text.length;
  setTimeout(() => {
    queryEditor.value?.setSelectionRange(newPos, newPos);
    queryEditor.value?.focus();
  }, 0);

  saveState();
};

const loadConnections = () => {
  vscode.postMessage({ command: "getConnections" });
};

const saveState = () => {
  vscode.postMessage({
    command: "saveState",
    payload: {
      query: query.value,
      selectedConnection: selectedConnection.value,
      limit: limit.value,
    },
  });
};

const restoreState = (state: any) => {
  if (state.query) query.value = state.query;
  if (state.selectedConnection) selectedConnection.value = state.selectedConnection;
  if (state.limit) limit.value = state.limit;
};

// Message handler
const handleMessage = (event: MessageEvent) => {
  const message = event.data;

  switch (message.command) {
    case "connections-loaded":
      if (message.payload.status === "success") {
        connections.value = message.payload.connections || [];
      } else {
        console.error("Failed to load connections:", message.payload.message);
        statusMessage.value = {
          type: 'error',
          text: 'Failed to load connections: ' + (message.payload.message || 'Unknown error')
        };
      }
      break;

    case "query-sent":
      // Query was sent to Query Preview panel
      statusMessage.value = {
        type: 'success',
        text: 'Query sent to Query Preview panel'
      };
      // Clear the message after 3 seconds
      setTimeout(() => {
        if (statusMessage.value?.type === 'success') {
          statusMessage.value = null;
        }
      }, 3000);
      break;

    case "query-result":
      if (message.payload.status === "error") {
        statusMessage.value = {
          type: 'error',
          text: message.payload.message || 'Query execution failed'
        };
      }
      break;

    case "insert-table":
      // Insert table reference from the Databases tree
      if (message.payload.tableName) {
        insertTextAtCursor(message.payload.tableName);
        // Always set the connection to match the inserted table
        if (message.payload.connectionName) {
          selectedConnection.value = message.payload.connectionName;
          saveState();
        }
      }
      break;

    case "restore-state":
      if (message.payload.state) {
        restoreState(message.payload.state);
      }
      break;
  }
};

// Lifecycle
onMounted(() => {
  window.addEventListener("message", handleMessage);
  loadConnections();
  vscode.postMessage({ command: "getState" });
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});

// Watch for changes to save state (debounced)
let saveTimeout: number | null = null;
watch([query, selectedConnection, limit], () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveState(), 500) as unknown as number;
}, { deep: true });
</script>

<style scoped>
.query-console {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  gap: 8px;
  font-size: 13px;
}

.console-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.limit-group {
  flex: 0 0 80px;
}

.selector-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.connection-dropdown {
  width: 100%;
}

.limit-input {
  width: 100%;
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 120px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-input-border);
}

.editor-title {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-actions {
  display: flex;
  gap: 4px;
}

.query-editor {
  flex: 1;
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: none;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: var(--vscode-editor-font-family), monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.query-editor::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keyboard-hint {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-left: auto;
}

.keyboard-hint kbd {
  padding: 2px 4px;
  background: var(--vscode-keybindingLabel-background);
  border: 1px solid var(--vscode-keybindingLabel-border);
  border-radius: 3px;
  font-family: inherit;
  font-size: 10px;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-message.success {
  background: var(--vscode-inputValidation-infoBackground);
  color: var(--vscode-inputValidation-infoForeground);
  border: 1px solid var(--vscode-inputValidation-infoBorder);
}

.status-message.error {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-errorForeground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
}
</style>
