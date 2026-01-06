<template>
  <div class="flex flex-col h-full">
    <!-- Summary Bar -->
    <div class="flex items-center justify-between py-2 px-3 bg-editorWidget-bg border-b border-panel-border">
      <div class="flex items-center gap-3">
        <span class="codicon codicon-diff-multiple text-editor-fg opacity-60"></span>
        <span class="text-sm text-editor-fg">
          <span class="font-semibold">{{ summary.rowCount.source }}</span>→<span class="font-semibold">{{ summary.rowCount.target }}</span> rows
          •
          <span class="font-semibold">{{ summary.columnCount.source }}</span>→<span class="font-semibold">{{ summary.columnCount.target }}</span> columns
          •
        </span>
        <span :class="impactBadgeClass" class="text-xs px-2 py-0.5 rounded">
          {{ impactLevel }} Impact
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="showImportantOnly = !showImportantOnly"
          :class="[
            'px-3 py-1 text-xs rounded transition-colors',
            showImportantOnly 
              ? 'bg-blue-600 text-white' 
              : 'bg-editorWidget-bg text-editor-fg border border-panel-border hover:bg-editor-bg'
          ]"
        >
          {{ showImportantOnly ? 'Important Only' : 'Show All' }}
        </button>
        <button class="p-1 text-editor-fg opacity-60 hover:opacity-100" title="View Code" @click="$emit('viewCode')">
          <span class="codicon codicon-code"></span>
        </button>
        <button class="p-1 text-editor-fg opacity-60 hover:opacity-100" title="Copy" @click="copyResults">
          <span class="codicon codicon-copy"></span>
        </button>
        <button class="p-1 text-editor-fg opacity-60 hover:opacity-100" title="Raw Output" @click="$emit('toggleRaw')">
          <span class="codicon codicon-list-flat"></span>
        </button>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex items-center gap-3 py-2 px-3 bg-editor-bg border-b border-panel-border">
      <div class="relative flex-1">
        <span class="codicon codicon-search absolute left-2 top-1/2 -translate-y-1/2 text-editor-fg opacity-40"></span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search columns..."
          class="w-full pl-8 pr-3 py-1.5 text-sm bg-editorWidget-bg border border-panel-border rounded text-editor-fg placeholder-editor-fg placeholder-opacity-40 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div class="relative">
        <select
          v-model="typeFilter"
          class="appearance-none pl-3 pr-8 py-1.5 text-sm bg-editorWidget-bg border border-panel-border rounded text-editor-fg focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="string">String</option>
          <option value="int">Integer</option>
          <option value="float">Float</option>
          <option value="bool">Boolean</option>
          <option value="date">Date/Time</option>
        </select>
        <span class="codicon codicon-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-editor-fg opacity-60 pointer-events-none"></span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center border-b border-panel-border bg-editor-bg">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
          activeTab === tab.id 
            ? 'border-blue-500 text-editor-fg' 
            : 'border-transparent text-editor-fg opacity-60 hover:opacity-100'
        ]"
      >
        <span :class="tab.icon"></span>
        {{ tab.label }}
        <span v-if="tab.count > 0" class="text-xs opacity-70">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-auto bg-editor-bg">
      <!-- Schema Tab -->
      <div v-if="activeTab === 'schema'" class="p-2">
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-xs text-editor-fg opacity-60">
            Showing {{ filteredSchemaColumns.length }} columns{{ schemaChangesCount > 0 ? ` with ${schemaChangesCount} schema changes` : '' }}
          </span>
          <button 
            v-if="expandedColumns.length > 0"
            @click="collapseAll"
            class="text-xs text-editor-fg opacity-60 hover:opacity-100"
          >
            Collapse All
          </button>
        </div>
        
        <div v-if="filteredSchemaColumns.length === 0" class="text-center py-8 text-editor-fg opacity-60">
          <span class="codicon codicon-info text-2xl block mb-2"></span>
          <p>No columns match your search</p>
        </div>
        
        <div v-else class="space-y-1">
          <div 
            v-for="column in filteredSchemaColumns" 
            :key="column.name"
            class="border border-panel-border rounded bg-editorWidget-bg overflow-hidden"
          >
            <div 
              @click="toggleColumn(column.name)"
              class="flex items-center justify-between p-2 cursor-pointer hover:bg-editor-bg"
            >
              <div class="flex items-center gap-2">
                <span :class="getStatusIcon(column.status)"></span>
                <span class="font-mono text-editor-fg text-sm font-medium">{{ column.name }}</span>
                <span class="text-xs text-editor-fg opacity-50">{{ column.type?.source || column.type?.target }}</span>
              </div>
              <span class="codicon text-editor-fg opacity-40" :class="expandedColumns.includes(column.name) ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
            </div>
            
            <div v-if="expandedColumns.includes(column.name)" class="border-t border-panel-border p-3 bg-editor-bg">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-editor-fg opacity-60 text-xs">
                    <th class="text-left py-1 font-medium">Property</th>
                    <th class="text-left py-1 font-medium">Source</th>
                    <th class="text-left py-1 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody class="text-editor-fg">
                  <tr :class="column.type?.isDifferent ? 'bg-yellow-500/10' : ''">
                    <td class="py-1 opacity-70">Type</td>
                    <td class="py-1 font-mono">{{ column.type?.source || '-' }}</td>
                    <td class="py-1 font-mono">{{ column.type?.target || '-' }}</td>
                  </tr>
                  <tr :class="column.nullable?.isDifferent ? 'bg-yellow-500/10' : ''">
                    <td class="py-1 opacity-70">Nullable</td>
                    <td class="py-1 font-mono">{{ column.nullable?.source || '-' }}</td>
                    <td class="py-1 font-mono">{{ column.nullable?.target || '-' }}</td>
                  </tr>
                  <tr :class="column.constraints?.isDifferent ? 'bg-yellow-500/10' : ''">
                    <td class="py-1 opacity-70">Constraints</td>
                    <td class="py-1 font-mono">{{ column.constraints?.source || '-' }}</td>
                    <td class="py-1 font-mono">{{ column.constraints?.target || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Tab -->
      <div v-if="activeTab === 'data'" class="p-2">
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-xs text-editor-fg opacity-60">
            Showing {{ filteredDataColumns.length }} columns with data changes
          </span>
          <button 
            v-if="expandedColumns.length > 0"
            @click="collapseAll"
            class="text-xs text-editor-fg opacity-60 hover:opacity-100"
          >
            Collapse All
          </button>
        </div>
        
        <div v-if="filteredDataColumns.length === 0" class="text-center py-8 text-editor-fg opacity-60">
          <span class="codicon codicon-info text-2xl block mb-2"></span>
          <p>No data statistics available</p>
        </div>
        
        <div v-else class="space-y-1">
          <div 
            v-for="column in filteredDataColumns" 
            :key="column.columnName"
            class="border border-panel-border rounded bg-editorWidget-bg overflow-hidden"
          >
            <div 
              @click="toggleColumn(column.columnName)"
              class="flex items-center justify-between p-2 cursor-pointer hover:bg-editor-bg"
            >
              <div class="flex items-center gap-2">
                <span :class="getDataTypeIcon(column.dataType)"></span>
                <span class="font-mono text-editor-fg text-sm font-medium">{{ column.columnName }}</span>
                <span class="text-xs text-editor-fg opacity-50">{{ column.dataType }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-editor-fg opacity-60">{{ getColumnChangeCount(column) }} changes</span>
                <span class="codicon text-editor-fg opacity-40" :class="expandedColumns.includes(column.columnName) ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
              </div>
            </div>
            
            <div v-if="expandedColumns.includes(column.columnName)" class="border-t border-panel-border bg-editor-bg">
              <table class="w-full text-xs">
                <thead class="bg-editorWidget-bg">
                  <tr class="text-editor-fg opacity-60 border-b border-panel-border">
                    <th class="text-left py-1.5 px-2 font-medium">Metric</th>
                    <th class="text-right py-1.5 px-2 font-medium">Source</th>
                    <th class="text-right py-1.5 px-2 font-medium">Target</th>
                    <th class="text-right py-1.5 px-2 font-medium">Δ</th>
                    <th class="text-right py-1.5 px-2 font-medium">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="stat in getFilteredStats(column)" 
                    :key="stat.name"
                    :class="hasStatChange(stat) ? 'bg-red-500/5' : ''"
                    class="border-b border-panel-border last:border-b-0"
                  >
                    <td class="py-1.5 px-2 text-editor-fg">{{ stat.name }}</td>
                    <td class="py-1.5 px-2 text-right font-mono text-editor-fg">{{ formatValue(stat.source) }}</td>
                    <td class="py-1.5 px-2 text-right font-mono text-editor-fg">{{ formatValue(stat.target) }}</td>
                    <td class="py-1.5 px-2 text-right font-mono" :class="getDiffClass(stat.diff)">{{ formatValue(stat.diff) }}</td>
                    <td class="py-1.5 px-2 text-right font-mono" :class="getDiffClass(stat.diffPercent)">{{ stat.diffPercent || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Tab -->
      <div v-if="activeTab === 'metrics'" class="p-4">
        <div class="text-center py-8 text-editor-fg opacity-60">
          <span class="codicon codicon-graph text-2xl block mb-2"></span>
          <p>Metrics visualization coming soon</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps<{
  rawOutput: string;
}>();

// Emit
defineEmits(['viewCode', 'toggleRaw']);

// Types
interface TableDiffSummary {
  rowCount: { source: number; target: number; diff: number };
  columnCount: { source: number; target: number; diff: number };
}

interface ColumnDiff {
  name: string;
  type: { source: string; target: string; isDifferent: boolean };
  nullable: { source: string; target: string; isDifferent: boolean };
  constraints: { source: string; target: string; isDifferent: boolean };
  status: 'added' | 'removed' | 'modified' | 'unchanged';
}

interface DataStatistic {
  name: string;
  source: string | number;
  target: string | number;
  diff: string | number;
  diffPercent?: string;
}

interface ColumnStatistics {
  columnName: string;
  dataType: string;
  statistics: DataStatistic[];
}

interface ParsedDiff {
  summary: TableDiffSummary;
  schemaDiffs: ColumnDiff[];
  columnStatistics: ColumnStatistics[];
  alterStatements?: string;
}

// State
const searchQuery = ref('');
const typeFilter = ref('all');
const activeTab = ref('schema');
const showImportantOnly = ref(false);
const expandedColumns = ref<string[]>([]);

// Parse the raw output
const parsedData = computed<ParsedDiff>(() => {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(props.rawOutput);
    return {
      summary: parsed.summary || { rowCount: { source: 0, target: 0, diff: 0 }, columnCount: { source: 0, target: 0, diff: 0 } },
      schemaDiffs: parsed.schemaDiffs || [],
      columnStatistics: parsed.columnStatistics || [],
      alterStatements: parsed.alterStatements || ''
    };
  } catch {
    // If not JSON, try to parse the text output
    return parseTextOutput(props.rawOutput);
  }
});

// Parse text output (fallback)
function parseTextOutput(text: string): ParsedDiff {
  const summary: TableDiffSummary = {
    rowCount: { source: 0, target: 0, diff: 0 },
    columnCount: { source: 0, target: 0, diff: 0 }
  };
  const schemaDiffs: ColumnDiff[] = [];
  const columnStatistics: ColumnStatistics[] = [];

  // Try to extract row/column counts from text
  const rowMatch = text.match(/Row Count[^\d]*(\d+)[^\d]*(\d+)/);
  if (rowMatch) {
    summary.rowCount.source = parseInt(rowMatch[1]);
    summary.rowCount.target = parseInt(rowMatch[2]);
    summary.rowCount.diff = summary.rowCount.target - summary.rowCount.source;
  }

  const colMatch = text.match(/Column Count[^\d]*(\d+)[^\d]*(\d+)/);
  if (colMatch) {
    summary.columnCount.source = parseInt(colMatch[1]);
    summary.columnCount.target = parseInt(colMatch[2]);
    summary.columnCount.diff = summary.columnCount.target - summary.columnCount.source;
  }

  return { summary, schemaDiffs, columnStatistics };
}

// Computed
const summary = computed(() => parsedData.value.summary);

const impactLevel = computed(() => {
  const schemaChanges = parsedData.value.schemaDiffs.filter(c => c.status !== 'unchanged').length;
  const dataChanges = parsedData.value.columnStatistics.filter(c => 
    c.statistics.some(s => hasStatChange(s))
  ).length;
  
  const total = schemaChanges + dataChanges;
  if (total === 0) return 'No';
  if (total <= 2) return 'Low';
  if (total <= 5) return 'Medium';
  return 'High';
});

const impactBadgeClass = computed(() => {
  switch (impactLevel.value) {
    case 'No': return 'bg-green-500/20 text-green-400';
    case 'Low': return 'bg-blue-500/20 text-blue-400';
    case 'Medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'High': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
});

const schemaChangesCount = computed(() => 
  parsedData.value.schemaDiffs.filter(c => c.status !== 'unchanged').length
);

const tabs = computed(() => [
  { id: 'schema', label: 'Schema', icon: 'codicon codicon-symbol-structure', count: schemaChangesCount.value },
  { id: 'data', label: 'Data', icon: 'codicon codicon-file', count: parsedData.value.columnStatistics.length },
  { id: 'metrics', label: 'Metrics', icon: 'codicon codicon-graph', count: 0 }
]);

const filteredSchemaColumns = computed(() => {
  let columns = parsedData.value.schemaDiffs;
  
  // Filter by important only
  if (showImportantOnly.value) {
    columns = columns.filter(c => c.status !== 'unchanged');
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    columns = columns.filter(c => c.name.toLowerCase().includes(query));
  }
  
  // Filter by type
  if (typeFilter.value !== 'all') {
    columns = columns.filter(c => {
      const type = (c.type?.source || c.type?.target || '').toLowerCase();
      return type.includes(typeFilter.value);
    });
  }
  
  return columns;
});

const filteredDataColumns = computed(() => {
  let columns = parsedData.value.columnStatistics;
  
  // Filter by important only - show only columns with changes
  if (showImportantOnly.value) {
    columns = columns.filter(c => c.statistics.some(s => hasStatChange(s)));
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    columns = columns.filter(c => c.columnName.toLowerCase().includes(query));
  }
  
  // Filter by type
  if (typeFilter.value !== 'all') {
    columns = columns.filter(c => c.dataType.toLowerCase().includes(typeFilter.value));
  }
  
  return columns;
});

// Methods
function toggleColumn(name: string) {
  const index = expandedColumns.value.indexOf(name);
  if (index > -1) {
    expandedColumns.value.splice(index, 1);
  } else {
    expandedColumns.value.push(name);
  }
}

function collapseAll() {
  expandedColumns.value = [];
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'added': return 'codicon codicon-add text-green-500';
    case 'removed': return 'codicon codicon-remove text-red-500';
    case 'modified': return 'codicon codicon-circle-filled text-yellow-500';
    default: return 'codicon codicon-check text-editor-fg opacity-40';
  }
}

function getDataTypeIcon(dataType: string): string {
  const type = dataType.toLowerCase();
  if (type.includes('string') || type.includes('text') || type.includes('varchar')) {
    return 'codicon codicon-symbol-string text-yellow-500';
  }
  if (type.includes('int') || type.includes('number') || type.includes('decimal')) {
    return 'codicon codicon-symbol-numeric text-blue-500';
  }
  if (type.includes('float') || type.includes('double') || type.includes('real')) {
    return 'codicon codicon-symbol-numeric text-blue-500';
  }
  if (type.includes('bool')) {
    return 'codicon codicon-symbol-boolean text-green-500';
  }
  if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
    return 'codicon codicon-calendar text-purple-500';
  }
  return 'codicon codicon-symbol-field text-editor-fg opacity-60';
}

function getColumnChangeCount(column: ColumnStatistics): number {
  return column.statistics.filter(s => hasStatChange(s)).length;
}

function hasStatChange(stat: DataStatistic): boolean {
  if (stat.diff === '-' || stat.diff === '0' || stat.diff === 0) return false;
  return true;
}

function getFilteredStats(column: ColumnStatistics): DataStatistic[] {
  if (showImportantOnly.value) {
    return column.statistics.filter(s => hasStatChange(s));
  }
  return column.statistics;
}

function getDiffClass(value: any): string {
  if (value === '-' || value === '0' || value === 0) return 'text-editor-fg opacity-60';
  const num = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
  if (isNaN(num)) return 'text-editor-fg';
  return num < 0 ? 'text-red-500' : 'text-green-500';
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(3).replace(/\.?0+$/, '');
  }
  return String(value);
}

function copyResults() {
  navigator.clipboard.writeText(props.rawOutput);
}

// Auto-expand columns with changes on data load
watch(() => parsedData.value, (newData) => {
  if (newData.schemaDiffs.length > 0 || newData.columnStatistics.length > 0) {
    // Expand columns with changes by default
    const changedSchema = newData.schemaDiffs.filter(c => c.status !== 'unchanged').map(c => c.name);
    const changedData = newData.columnStatistics.filter(c => 
      c.statistics.some(s => hasStatChange(s))
    ).map(c => c.columnName);
    expandedColumns.value = [...changedSchema, ...changedData];
  }
}, { immediate: true });
</script>

<style scoped>
select {
  background-image: none;
}

input::placeholder {
  opacity: 0.4;
}
</style>

