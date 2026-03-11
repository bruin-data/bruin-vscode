<template>
  <div class="query-console">
    <!-- Connection and Environment Selectors -->
    <div class="console-header">
      <div class="selector-row">
        <div class="selector-group">
          <label class="selector-label">Connection</label>
          <vscode-dropdown v-model="selectedConnection" @change="onConnectionChange" class="connection-dropdown">
            <vscode-option value="">Select connection...</vscode-option>
            <vscode-option v-for="conn in connections" :key="`${conn.name}-${conn.environment}`" :value="conn.name">
              {{ conn.name }} ({{ conn.environment || 'default' }})
            </vscode-option>
          </vscode-dropdown>
        </div>
        <div class="selector-group limit-group">
          <label class="selector-label">Limit</label>
          <vscode-text-field v-model="limit" type="number" min="1" max="50000" class="limit-input" placeholder="1000" />
        </div>
      </div>
    </div>

    <!-- Query Editor Area -->
    <div class="editor-container">
      <div class="editor-header">
        <span class="editor-title">SQL Query</span>
        <div class="editor-actions">
          <vscode-button appearance="icon" title="Clear query" @click="clearQuery" :disabled="!query.trim()">
            <span class="codicon codicon-clear-all"></span>
          </vscode-button>
        </div>
      </div>
      <div ref="editorContainer" class="codemirror-container"></div>
    </div>

    <!-- Action Buttons -->
    <div class="action-bar">
      <vscode-button @click="executeQuery" :disabled="!canExecute || runStatus === 'loading'" class="text-xs h-7"
        title="Run query in Query Preview panel">
        <span class="codicon codicon-play mr-1"></span> Run in Preview
      </vscode-button>
      <span class="keyboard-hint">
        <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Enter</kbd>
      </span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from "vue";
import { vscode } from "./utilities/vscode";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { sql } from "@codemirror/lang-sql";
import { defaultKeymap } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// State
const query = ref("");
const selectedConnection = ref("");
const limit = ref("1000");
const connections = ref<Array<{ name: string; type: string; environment?: string }>>([]);
const editorContainer = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const runStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');

// Computed
const isMac = computed(() => navigator.platform.toUpperCase().indexOf("MAC") >= 0);

const canExecute = computed(() => {
  return query.value.trim() && selectedConnection.value;
});

// VS Code theme for CodeMirror
const vscodeTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--vscode-input-background)",
    color: "var(--vscode-input-foreground)",
    fontSize: "13px",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "var(--vscode-editor-font-family), monospace",
    padding: "8px",
    caretColor: "var(--vscode-editorCursor-foreground)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--vscode-editorCursor-foreground)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--vscode-editor-selectionBackground)",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-placeholder": {
    color: "var(--vscode-input-placeholderForeground)",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
}, { dark: true });

// SQL syntax highlighting colors for VS Code theme
const sqlHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.comment, color: "#6a9955" },
  { tag: tags.typeName, color: "#4ec9b0" },
  { tag: tags.propertyName, color: "#9cdcfe" },
  { tag: tags.variableName, color: "#9cdcfe" },
  { tag: tags.punctuation, color: "#d4d4d4" },
  { tag: tags.bracket, color: "#ffd700" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.standard(tags.name), color: "#4ec9b0" },
]);

// Methods
const executeQuery = () => {
  if (!canExecute.value || runStatus.value === 'loading') return;

  runStatus.value = 'loading';

  vscode.postMessage({
    command: "executeQuery",
    query: query.value,
    connectionName: selectedConnection.value,
    environment: getSelectedEnvironment(),
    limit: limit.value || "1000",
  });
};

const clearQuery = () => {
  query.value = "";
  if (editorView.value) {
    editorView.value.dispatch({
      changes: { from: 0, to: editorView.value.state.doc.length, insert: "" }
    });
  }
};

const getSelectedEnvironment = (): string => {
  const conn = connections.value.find((c) => c.name === selectedConnection.value);
  return conn?.environment || "";
};

const onConnectionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedConnection.value = target.value;
  saveState();
};

const setEditorContent = (content: string) => {
  if (editorView.value) {
    editorView.value.dispatch({
      changes: { from: 0, to: editorView.value.state.doc.length, insert: content }
    });
  }
};

const insertAtCursor = (text: string) => {
  if (editorView.value) {
    const cursor = editorView.value.state.selection.main.head;
    editorView.value.dispatch({
      changes: { from: cursor, insert: text },
      selection: { anchor: cursor + text.length }
    });
    editorView.value.focus();
  }
};

const loadConnections = () => {
  vscode.postMessage({ command: "getConnections" });
};

const saveState = () => {
  vscode.postMessage({
    command: "saveState",
    payload: {
      selectedConnection: selectedConnection.value,
      limit: limit.value,
    },
  });
};

const restoreState = (state: any) => {
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
        // Request state after connections are loaded
        vscode.postMessage({ command: "getState" });
      } else {
        console.error("Failed to load connections:", message.payload.message);
      }
      break;

    case "query-sent":
      // Query was sent to Query Preview panel
      runStatus.value = 'success';
      // Reset after 3 seconds
      setTimeout(() => {
        runStatus.value = 'idle';
      }, 3000);
      break;

    case "query-result":
      if (message.payload.status === "error") {
        runStatus.value = 'error';
        // Reset after 3 seconds
        setTimeout(() => {
          runStatus.value = 'idle';
        }, 3000);
      }
      break;

    case "insert-table":
      // Insert table reference from the Databases tree
      if (message.payload.tableName) {
        const tableName = message.payload.tableName;

        if (query.value.trim() === "") {
          // Empty query: insert full select statement
          const newQuery = `select * from ${tableName}`;
          query.value = newQuery;
          setEditorContent(newQuery);
        } else {
          // Query has content: insert just the table name at cursor
          insertAtCursor(tableName);
        }

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

  // Initialize CodeMirror editor
  if (editorContainer.value) {
    const runQueryKeymap = keymap.of([{
      key: "Mod-Enter",
      run: () => {
        executeQuery();
        return true;
      }
    }]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        query.value = update.state.doc.toString();
      }
    });

    const state = EditorState.create({
      doc: "",
      extensions: [
        runQueryKeymap,
        keymap.of(defaultKeymap),
        sql(),
        autocompletion(),
        vscodeTheme,
        syntaxHighlighting(sqlHighlightStyle),
        placeholder("Enter your SQL query here...\n\nClick the arrow icon on any table in the Databases panel to insert it."),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    editorView.value = new EditorView({
      state,
      parent: editorContainer.value,
    });
  }
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
  if (editorView.value) {
    editorView.value.destroy();
  }
});

// Watch for changes to save state (debounced)
let saveTimeout: number | null = null;
watch([selectedConnection, limit], () => {
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
  max-height: 400px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  overflow: hidden;
  resize: vertical;
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

.codemirror-container {
  flex: 1;
  width: 100%;
  min-height: 100px;
  overflow: auto;
}

.codemirror-container :deep(.cm-editor) {
  height: 100%;
}

.codemirror-container :deep(.cm-scroller) {
  min-height: 100px;
  overflow: auto;
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

vscode-button::part(control){
  @apply border-none pl-1;
}

.codicon-play {
  font-size: 12px !important;
}
.codicon-play::before{
  vertical-align: middle;
}
</style>
