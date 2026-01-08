<template>
  <div class="flex flex-col h-full">
    <!-- Legacy CLI Warning -->
    <div v-if="isLegacyOutput" class="flex items-center gap-2 py-2 px-3 bg-yellow-500/10 border-b border-yellow-500/30">
      <span class="codicon codicon-warning text-yellow-500"></span>
      <span class="text-xs text-editor-fg">
        Update Bruin CLI to v0.11.404+ for detailed comparison results. 
      </span>
    </div>

    <!-- Summary Bar (only show if we have data) -->
    <div v-if="!isLegacyOutput" class="flex items-center py-2 px-3 bg-editorWidget-bg border-b border-panel-border">
      <div class="flex items-center gap-3">
        <span class="codicon codicon-diff-multiple text-editor-fg opacity-60"></span>
        <span class="text-sm text-editor-fg">
          <span class="font-semibold">{{ summary.rowCount.source }}</span>→<span class="font-semibold">{{ summary.rowCount.target }}</span> rows
          •
          <span class="font-semibold">{{ summary.columnCount.source }}</span>→<span class="font-semibold">{{ summary.columnCount.target }}</span> columns
        </span>
      </div>
    </div>

    <!-- Legacy Raw Output -->
    <div v-if="isLegacyOutput" class="flex-1 overflow-auto p-3 bg-editor-bg">
      <pre class="text-xs font-mono text-editor-fg whitespace-pre-wrap">{{ rawOutput }}</pre>
    </div>

    <!-- Tab Navigation (hide in legacy mode) -->
    <div v-if="!isLegacyOutput" class="flex items-center border-b border-panel-border bg-editor-bg">
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
        <span 
          v-if="tab.count > 0" 
          class="text-2xs min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-badge-bg text-editor-fg"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Tab Content (hide in legacy mode) -->
    <div v-if="!isLegacyOutput" class="flex-1 overflow-auto bg-editor-bg">
      <!-- Schema Tab -->
      <div v-if="activeTab === 'schema'" class="p-2">
        <!-- Search & Filter Bar -->
        <div class="flex items-center justify-between gap-2 py-1 px-1 mb-2">
          <div class="flex items-center gap-2">
            <div class="relative">
              <span class="codicon codicon-search absolute left-2 top-1/2 -translate-y-1/2 text-editor-fg opacity-40 text-xs"></span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search..."
                class="w-40 pl-7 pr-2 py-1 text-xs bg-editorWidget-bg border border-panel-border rounded text-editor-fg placeholder-editor-fg placeholder-opacity-40 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              @click="showImportantOnly = !showImportantOnly"
              class="text-xs text-editor-fg opacity-60 hover:opacity-100"
            >
              {{ showImportantOnly ? 'Show All' : 'Changes Only' }}
            </button>
          </div>
          <span class="text-xs text-editor-fg opacity-60">
            {{ filteredSchemaColumns.length }} columns{{ schemaChangesCount > 0 ? ` • ${schemaChangesCount} changes` : '' }}
          </span>
        </div>
        
        <div v-if="filteredSchemaColumns.length === 0" class="text-center py-6 text-editor-fg opacity-60">
          <span class="codicon codicon-info text-xl block mb-1"></span>
          <p class="text-xs">No columns match your search</p>
        </div>
        
        <!-- CLI-style Table -->
        <div v-else class="border border-panel-border rounded overflow-hidden overflow-x-auto">
          <table class="w-full text-2xs">
            <thead class="bg-editorWidget-bg">
              <tr class="border-b border-panel-border">
                <th class="text-left py-1 px-1.5 font-medium text-editor-fg">Column</th>
                <th class="text-left py-1 px-1.5 font-medium text-editor-fg opacity-60">Prop</th>
                <th class="text-left py-1 px-1.5 font-medium text-editor-fg truncate max-w-[180px]" :title="parsedData.sourceTable">
                  {{ formatTableName(parsedData.sourceTable) }}
                </th>
                <th class="text-left py-1 px-1.5 font-medium text-editor-fg truncate max-w-[180px]" :title="parsedData.targetTable">
                  {{ formatTableName(parsedData.targetTable) }}
                </th>
              </tr>
            </thead>
            <tbody 
              v-for="(column, idx) in filteredSchemaColumns" 
              :key="column.name"
              class="schema-group"
              :class="{ 'schema-row-alt': idx % 2 === 1 }"
            >
              <!-- Type row -->
              <tr>
                <td rowspan="3" class="py-0.5 px-1.5 font-mono font-medium align-top border-r border-panel-border border-b" :class="getColumnNameClass(column.status)">
                  {{ column.name }}
                </td>
                <td class="py-0.5 px-1.5 text-editor-fg opacity-60">Type</td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.type?.source, column.status, 'source')">
                  {{ column.type?.source || '-' }}
                </td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.type?.target, column.status, 'target')">
                  {{ column.type?.target || '-' }}
                </td>
              </tr>
              <!-- Nullable row -->
              <tr>
                <td class="py-0.5 px-1.5 text-editor-fg opacity-60">Nullable</td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.nullable?.source, column.status, 'source')">
                  {{ column.nullable?.source || '-' }}
                </td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.nullable?.target, column.status, 'target')">
                  {{ column.nullable?.target || '-' }}
                </td>
              </tr>
              <!-- Constraints row -->
              <tr class="border-b border-panel-border">
                <td class="py-0.5 px-1.5 text-editor-fg opacity-60">Constraints</td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.constraints?.source, column.status, 'source')">
                  {{ column.constraints?.source || '-' }}
                </td>
                <td class="py-0.5 px-1.5 font-mono" :class="getValueClass(column.constraints?.target, column.status, 'target')">
                  {{ column.constraints?.target || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- ALTER Statements -->
        <div v-if="parsedData.alterStatements" class="mt-3 px-1">
          <div class="border border-panel-border rounded bg-editorWidget-bg overflow-hidden">
            <div 
              @click="showAlterStatements = !showAlterStatements"
              class="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-editor-bg"
            >
              <div class="flex items-center gap-2">
                <span class="codicon codicon-database text-yellow-500 text-xs"></span>
                <span class="text-xs font-medium text-editor-fg">Sync SQL</span>
                <span class="text-2xs text-editor-fg opacity-50">ALTER statements to match source</span>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click.stop="copyAlterStatements"
                  class="p-0.5 text-editor-fg opacity-60 hover:opacity-100"
                  :title="copiedAlter ? 'Copied!' : 'Copy SQL'"
                >
                  <span :class="copiedAlter ? 'codicon codicon-check text-green-500' : 'codicon codicon-copy'" class="text-xs"></span>
                </button>
                <span class="codicon text-editor-fg opacity-40 text-xs" :class="showAlterStatements ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
              </div>
            </div>
            <div v-if="showAlterStatements" class="border-t border-panel-border bg-editor-bg p-2">
              <pre class="text-xs font-mono text-editor-fg whitespace-pre-wrap">{{ parsedData.alterStatements }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Tab -->
      <div v-if="activeTab === 'data'" class="py-2">
        <!-- Search & Filter Bar for Data -->
        <div class="flex items-center gap-2 py-1 px-1 mb-1">
          <div class="relative flex-1">
            <span class="codicon codicon-search absolute left-2 top-1/2 -translate-y-1/2 text-editor-fg opacity-40 text-xs"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="w-full pl-7 pr-2 py-1 text-xs bg-editorWidget-bg border border-panel-border rounded text-editor-fg placeholder-editor-fg placeholder-opacity-40 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div class="relative">
            <select
              v-model="typeFilter"
              class="appearance-none pl-2 pr-6 py-1 text-xs bg-editorWidget-bg border border-panel-border rounded text-editor-fg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="string">String</option>
              <option value="int">Int</option>
              <option value="float">Float</option>
              <option value="bool">Bool</option>
              <option value="date">Date</option>
            </select>
            <span class="codicon codicon-chevron-down absolute right-1.5 top-1/2 -translate-y-1/2 text-editor-fg opacity-60 pointer-events-none text-xs"></span>
          </div>
        </div>
        
        <div class="flex items-center justify-between mb-1 px-1">
          <span class="text-xs text-editor-fg opacity-60">
            {{ filteredDataColumns.length }} columns
          </span>
          <div class="flex items-center gap-2">
            <button
              @click="showImportantOnly = !showImportantOnly"
              class="text-xs text-editor-fg opacity-60 hover:opacity-100"
            >
              {{ showImportantOnly ? 'Show All' : 'Important Only' }}
            </button>
            <span class="text-editor-fg opacity-20">|</span>
            <button 
              v-if="!allDataExpanded"
              @click="expandAll('data')"
              class="text-xs text-editor-fg opacity-60 hover:opacity-100"
            >
              Expand All
            </button>
            <button 
              v-else
              @click="collapseAll"
              class="text-xs text-editor-fg opacity-60 hover:opacity-100"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        <div v-if="filteredDataColumns.length === 0" class="text-center py-6 text-editor-fg opacity-60">
          <span class="codicon codicon-info text-xl block mb-1"></span>
          <p class="text-xs">No data statistics available</p>
        </div>
        
        <div v-else class="space-y-1">
          <div 
            v-for="column in filteredDataColumns" 
            :key="column.columnName"
            class="border border-panel-border rounded bg-editorWidget-bg overflow-hidden"
          >
            <div 
              @click="toggleColumn(column.columnName)"
              class="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-editor-bg"
            >
              <div class="flex items-center gap-2">
                <span :class="getDataTypeIcon(column.dataType)" class="text-xs"></span>
                <span class="font-mono text-editor-fg text-xs font-medium">{{ column.columnName }}</span>
                <span class="text-xs text-editor-fg opacity-50">{{ column.dataType }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-editor-fg opacity-60">{{ getColumnChangeCount(column) }} Δ</span>
                <span class="codicon text-editor-fg opacity-40 text-xs" :class="expandedColumns.includes(column.columnName) ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
              </div>
            </div>
            
            <div v-if="expandedColumns.includes(column.columnName)" class="border-t border-panel-border bg-editor-bg">
              <table class="w-full text-xs">
                <thead class="bg-editorWidget-bg">
                  <tr class="text-editor-fg opacity-60 border-b border-panel-border">
                    <th class="text-left py-1 px-2 font-medium">Metric</th>
                    <th class="text-right py-1 px-2 font-medium truncate max-w-[120px]" :title="parsedData.sourceTable">{{ formatTableName(parsedData.sourceTable) }}</th>
                    <th class="text-right py-1 px-2 font-medium truncate max-w-[120px]" :title="parsedData.targetTable">{{ formatTableName(parsedData.targetTable) }}</th>
                    <th class="text-right py-1 px-2 font-medium">Δ</th>
                    <th class="text-right py-1 px-2 font-medium">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="stat in getFilteredStats(column)" 
                    :key="stat.name"
                    :class="hasStatChange(stat) ? 'bg-red-500/5' : ''"
                    class="border-b border-panel-border last:border-b-0"
                  >
                    <td class="py-1 px-2 text-editor-fg">{{ stat.name }}</td>
                    <td class="py-1 px-2 text-right font-mono text-editor-fg">{{ formatValue(stat.source) }}</td>
                    <td class="py-1 px-2 text-right font-mono text-editor-fg">{{ formatValue(stat.target) }}</td>
                    <td class="py-1 px-2 text-right font-mono" :class="getDiffClass(stat.diff)">{{ formatValue(stat.diff) }}</td>
                    <td class="py-1 px-2 text-right font-mono" :class="getDiffClass(stat.diffPercent)">{{ stat.diffPercent || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
  sourceTable?: string;
  targetTable?: string;
}

// State
const searchQuery = ref('');
const typeFilter = ref('all');
const activeTab = ref('schema');
const showImportantOnly = ref(false);
const expandedColumns = ref<string[]>([]);
const showAlterStatements = ref(false);
const copiedAlter = ref(false);

// Track if we're using legacy (non-JSON) output
const isLegacyOutput = ref(false);

// Parse the raw output
const parsedData = computed<ParsedDiff>(() => {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(props.rawOutput);
    isLegacyOutput.value = false;
    return {
      summary: parsed.summary || { rowCount: { source: 0, target: 0, diff: 0 }, columnCount: { source: 0, target: 0, diff: 0 } },
      schemaDiffs: parsed.schemaDiffs || [],
      columnStatistics: parsed.columnStatistics || [],
      alterStatements: parsed.alterStatements || '',
      sourceTable: parsed.sourceTable || 'Source',
      targetTable: parsed.targetTable || 'Target'
    };
  } catch {
    // If not JSON, we're in legacy mode
    isLegacyOutput.value = true;
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

const schemaChangesCount = computed(() => 
  parsedData.value.schemaDiffs.filter(c => c.status !== 'unchanged').length
);

const tabs = computed(() => [
  { id: 'schema', label: 'Schema', icon: 'codicon codicon-symbol-structure', count: schemaChangesCount.value },
  { id: 'data', label: 'Data', icon: 'codicon codicon-file', count: parsedData.value.columnStatistics.length }
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

// Check if all columns are expanded
const allSchemaExpanded = computed(() => {
  if (filteredSchemaColumns.value.length === 0) return false;
  return filteredSchemaColumns.value.every(c => expandedColumns.value.includes(c.name));
});

const allDataExpanded = computed(() => {
  if (filteredDataColumns.value.length === 0) return false;
  return filteredDataColumns.value.every(c => expandedColumns.value.includes(c.columnName));
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

function expandAll(tabType: 'schema' | 'data') {
  if (tabType === 'schema') {
    expandedColumns.value = filteredSchemaColumns.value.map(c => c.name);
  } else {
    expandedColumns.value = filteredDataColumns.value.map(c => c.columnName);
  }
}

function copyAlterStatements() {
  if (parsedData.value.alterStatements) {
    navigator.clipboard.writeText(parsedData.value.alterStatements);
    copiedAlter.value = true;
    setTimeout(() => {
      copiedAlter.value = false;
    }, 2000);
  }
}

function formatTableName(fullName: string | undefined): string {
  if (!fullName) return 'Table';
  // If it's in format "connection:schema.table", extract just "schema.table"
  const parts = fullName.split(':');
  return parts.length > 1 ? parts[1] : fullName;
}

function getColumnNameClass(status: string): string {
  // Yellow for any difference, default for match
  if (status === 'added' || status === 'removed' || status === 'modified') {
    return 'text-green-500';
  }
  return 'text-editor-fg';
}

function getValueClass(value: string | undefined, status: string, side: 'source' | 'target'): string {
  const val = value || '-';
  
  // If the value is "-", it's missing
  if (val === '-') {
    return 'text-editor-fg opacity-40';
  }
  
  // Yellow for any column that has differences
  if (status === 'added' || status === 'removed' || status === 'modified') {
    return 'text-green-500';
  }
  
  // Default - matching values
  return 'text-editor-fg';
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

/* Alternating row backgrounds for schema table */
.schema-row-alt {
  background-color: var(--vscode-editorWidget-background);
}

/* Hover highlights entire column group */
.schema-group:hover tr {
  background-color: var(--vscode-list-hoverBackground);
}
</style>

