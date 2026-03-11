<template>
  <div class="query-console">
    <div class="console-header">
      <div class="selector-row">
        <div class="selector-group">
          <label class="selector-label">Connection</label>
          <vscode-dropdown v-model="selectedConnection" @change="onConnectionChange" class="w-full">
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
            class="w-full"
            placeholder="1000"
          />
        </div>
      </div>
    </div>

    <div class="editor-container">
      <div class="editor-header">
        <span class="editor-title">SQL Query</span>
        <vscode-button
          appearance="icon"
          title="Clear query"
          @click="clearQuery"
          :disabled="!query.trim()"
        >
          <span class="codicon codicon-clear-all"></span>
        </vscode-button>
      </div>
      <div ref="editorContainer" class="codemirror-container"></div>
    </div>

    <div class="action-bar">
      <vscode-button
        @click="executeQuery"
        :disabled="!canExecute || isLoading"
        class="run-button"
        title="Run query in Query Preview panel"
      >
        <span class="codicon codicon-play"></span>
        Run in Preview
      </vscode-button>
      <span class="keyboard-hint">
        <kbd>{{ isMac ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>Enter</kbd>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from "vue";
import { vscode } from "./utilities/vscode";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { sql } from "@codemirror/lang-sql";
import { defaultKeymap } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Types
interface Connection {
  name: string;
  type: string;
  environment?: string;
}

// State
const query = ref("");
const selectedConnection = ref("");
const limit = ref("1000");
const connections = ref<Connection[]>([]);
const editorContainer = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const runStatus = ref<"idle" | "loading" | "success" | "error">("idle");

// Computed
const isMac = computed(() => navigator.platform.toUpperCase().includes("MAC"));
const isLoading = computed(() => runStatus.value === "loading");
const canExecute = computed(() => query.value.trim() && selectedConnection.value);

// CodeMirror Theme
const vscodeTheme = EditorView.theme(
  {
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
    ".cm-cursor": { borderLeftColor: "var(--vscode-editorCursor-foreground)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--vscode-editor-selectionBackground)",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-gutters": { display: "none" },
    ".cm-placeholder": { color: "var(--vscode-input-placeholderForeground)" },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: true }
);

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

// Editor Methods
const setEditorContent = (content: string) => {
  if (!editorView.value) return;
  editorView.value.dispatch({
    changes: { from: 0, to: editorView.value.state.doc.length, insert: content },
  });
};

const insertAtCursor = (text: string) => {
  if (!editorView.value) return;
  const cursor = editorView.value.state.selection.main.head;
  editorView.value.dispatch({
    changes: { from: cursor, insert: text },
    selection: { anchor: cursor + text.length },
  });
  editorView.value.focus();
};

const clearQuery = () => {
  query.value = "";
  setEditorContent("");
};

// State Management
const saveState = () => {
  vscode.postMessage({
    command: "saveState",
    payload: { selectedConnection: selectedConnection.value, limit: limit.value },
  });
};

const restoreState = (state: { selectedConnection?: string; limit?: string }) => {
  if (state.selectedConnection) selectedConnection.value = state.selectedConnection;
  if (state.limit) limit.value = state.limit;
};

// Query Execution
const getSelectedEnvironment = (): string => {
  return connections.value.find((c) => c.name === selectedConnection.value)?.environment || "";
};

const executeQuery = () => {
  if (!canExecute.value || isLoading.value) return;
  runStatus.value = "loading";
  vscode.postMessage({
    command: "executeQuery",
    query: query.value,
    connectionName: selectedConnection.value,
    environment: getSelectedEnvironment(),
    limit: limit.value || "1000",
  });
};

// Event Handlers
const onConnectionChange = (event: Event) => {
  selectedConnection.value = (event.target as HTMLSelectElement).value;
  saveState();
};

const handleMessage = (event: MessageEvent) => {
  const { command, payload } = event.data;

  switch (command) {
    case "connections-loaded":
      if (payload.status === "success") {
        connections.value = payload.connections || [];
        vscode.postMessage({ command: "getState" });
      }
      break;

    case "query-sent":
      runStatus.value = "success";
      setTimeout(() => (runStatus.value = "idle"), 3000);
      break;

    case "query-result":
      if (payload.status === "error") {
        runStatus.value = "error";
        setTimeout(() => (runStatus.value = "idle"), 3000);
      }
      break;

    case "insert-table":
      if (payload.tableName) {
        if (query.value.trim() === "") {
          const newQuery = `select * from ${payload.tableName}`;
          query.value = newQuery;
          setEditorContent(newQuery);
        } else {
          insertAtCursor(payload.tableName);
        }
        if (payload.connectionName) {
          selectedConnection.value = payload.connectionName;
          saveState();
        }
      }
      break;

    case "restore-state":
      if (payload.state) restoreState(payload.state);
      break;
  }
};

// Lifecycle
const initEditor = () => {
  if (!editorContainer.value) return;

  const extensions = [
    keymap.of([{ key: "Mod-Enter", run: () => (executeQuery(), true) }]),
    keymap.of(defaultKeymap),
    sql(),
    autocompletion(),
    vscodeTheme,
    syntaxHighlighting(sqlHighlightStyle),
    placeholder("Enter your SQL query here...\n\nClick the arrow icon on any table in the Databases panel to insert it."),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) query.value = update.state.doc.toString();
    }),
    EditorView.lineWrapping,
  ];

  editorView.value = new EditorView({
    state: EditorState.create({ doc: "", extensions }),
    parent: editorContainer.value,
  });
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  vscode.postMessage({ command: "getConnections" });
  initEditor();
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
  editorView.value?.destroy();
});
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

.codemirror-container {
  flex: 1;
  overflow: auto;
}

.codemirror-container :deep(.cm-editor) {
  height: 100%;
}

.codemirror-container :deep(.cm-scroller) {
  min-height: 100px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.run-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.run-button .codicon-play {
  font-size: 12px;
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
