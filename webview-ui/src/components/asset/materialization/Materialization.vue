<template>
  <div class="h-full w-full flex justify-center">
    <div class="flex flex-col gap-6 h-full w-full max-w-4xl pr-1">
      <!-- Basic Information Section -->
      <div id="basic-info-section" class="collapsible-section">
        <div id="basic-info-section-header" class="section-header" @click="toggleSection('basicInfo')">
          <div class="flex items-center justify-between w-full">
            <h2 class="text-sm font-medium text-editor-fg">Basic Information</h2>
            <span
              class="codicon transition-transform duration-200"
              :class="expandedSections.basicInfo ? 'codicon-chevron-down' : 'codicon-chevron-right'"
            ></span>
          </div>
        </div>

        <div v-if="expandedSections.basicInfo" class="section-content">
          <!-- Owner -->
          <div class="flex items-center gap-3">
            <label class="field-label min-w-[60px]">Owner</label>
            <div
              id="owner-text-container"
              class="text-xs text-editor-fg px-2 py-1 flex items-center min-h-[32px] flex-1"
              :class="{ 'cursor-pointer': !isEditingOwner, 'hover-background': !isEditingOwner }"
              @click="startEditingOwner"
            >
              <template v-if="isEditingOwner">
                <input
                  id="owner-input"
                  v-model="editingOwner"
                  @blur="saveOwnerEdit"
                  @keyup.enter="saveOwnerEdit"
                  @keyup.escape="cancelOwnerEdit"
                  @mouseleave="handleOwnerInputMouseLeave"
                  ref="ownerInput"
                  placeholder="data-team@company.com"
                  class="text-xs bg-input-background border-0 w-full p-0 text-editor-fg truncate focus:outline-none focus:ring-0"
                />
              </template>
              <template v-else>
                <span id="owner-text" :class="owner ? '' : 'text-editor-fg opacity-60 italic'">
                  {{ owner || "Click to set owner" }}
                </span>
              </template>
            </div>
          </div>

          <!-- Tags -->
          <div class="flex items-center gap-3">
            <label class="field-label min-w-[60px]">Tags</label>
            <div id="tags-container" class="flex flex-wrap items-center space-x-2 flex-1">
              <vscode-tag
                v-for="(tag, index) in tags"
                :key="index"
                class="text-xs inline-flex items-center justify-center gap-1 cursor-pointer py-1"
                @click="removeTag(index)"
              >
                <div class="text-xs flex items-center gap-2">
                  <span id="tag-text">{{ tag }}</span>
                  <span class="codicon codicon-close text-3xs flex items-center"></span>
                </div>
              </vscode-tag>

              <input
                id="tag-input"
                v-if="isAddingTag"
                v-model="newTag"
                @blur="confirmAddTag"
                @keyup.enter="confirmAddTag"
                @keyup.escape="cancelAddTag"
                ref="tagInput"
                placeholder="Tag name..."
                class="text-2xs bg-input-background focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[80px] h-6"
              />
              <vscode-button
                id="add-tag-button"
                appearance="icon"
                @click="startAddingTag"
                v-if="!isAddingTag"
                class="text-xs flex items-center justify-center h-full"
                title="Add tag"
              >
                <span class="codicon codicon-add"></span>
              </vscode-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Section -->
      <div id="advanced-section" class="collapsible-section">
        <div id="advanced-section-header" class="section-header" @click="toggleSection('advanced')">
          <div class="flex items-center justify-between w-full">
            <h2 class="text-sm font-medium text-editor-fg">Advanced Settings</h2>
            <span
              id="advanced-section-chevron"
              class="codicon transition-transform duration-200"
              :class="expandedSections.advanced ? 'codicon-chevron-down' : 'codicon-chevron-right'"
            ></span>
          </div>
        </div>

        <div v-if="expandedSections.advanced" class="section-content">
          <!-- Interval Modifiers -->
          <div class="field-group">
            <label class="field-label">Interval Modifiers</label>
            <div class="flex gap-x-4 gap-y-2 w-full justify-between">
              <div class="flex-1">
                <label class="block text-xs font-medium text-editor-fg mb-1">Start</label>
                <div class="flex gap-2">
                  <input
                    id="start-interval-input"
                    :value="startIntervalValue"
                    @input="
                      startIntervalValue = $event.target.value;
                      handleIntervalChange('start');
                    "
                    @change="handleIntervalChange('start')"
                    class="w-1/2 border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                    placeholder="e.g., -2"
                  />
                  <select
                    id="start-interval-unit"
                    :value="startIntervalUnit"
                    @change="
                      startIntervalUnit = $event.target.value;
                      handleIntervalChange('start');
                    "
                    class="w-1/2 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                  >
                    <option value="" class="text-xs opacity-60" disabled>select unit...</option>
                    <option v-for="unit in intervalUnits" :key="unit" :value="unit">
                      {{ unit }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="flex-1">
                <label class="block text-xs font-medium text-editor-fg mb-1">End</label>
                <div class="flex gap-2">
                  <input
                    id="end-interval-input"
                    :value="endIntervalValue"
                    @input="
                      endIntervalValue = $event.target.value;
                      handleIntervalChange('end');
                    "
                    @change="handleIntervalChange('end')"
                    class="w-1/2 border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                    placeholder="e.g., 1"
                  />
                  <select
                    id="end-interval-unit"
                    :value="endIntervalUnit"
                    @change="
                      endIntervalUnit = $event.target.value;
                      handleIntervalChange('end');
                    "
                    class="w-1/2 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                  >
                    <option value="" class="text-xs opacity-60" disabled>select unit...</option>
                    <option v-for="unit in intervalUnits" :key="unit" :value="unit">
                      {{ unit }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Partition By and Cluster By -->
          <div v-if="localMaterialization.type === 'table'" class="flex gap-x-4 gap-y-2 w-full justify-between" @click="handleClickOutside">
            <div class="flex-1">
              <label class="block text-xs font-medium text-editor-fg mb-1">Partitioning</label>
              <div class="relative w-full" ref="partitionContainer">
                <input
                  id="partition-input"
                  v-model="partitionInput"
                  placeholder="Column or expression..."
                  class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-6 h-6"
                  @focus="isPartitionDropdownOpen = true"
                  @blur="handlePartitionInputBlur"
                  @input="handlePartitionInput"
                  @keydown.enter="handlePartitionEnter"
                />
                <span
                  class="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
                  @click="isPartitionDropdownOpen = !isPartitionDropdownOpen"
                >
                  <span class="codicon codicon-chevron-down text-xs"></span>
                </span>

                <div
                  v-if="isPartitionDropdownOpen"
                  class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-60 overflow-y-auto"
                >
                  <div
                    class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer"
                    @mousedown.prevent="
                      selectPartitionColumn('');
                      isPartitionDropdownOpen = false;
                    "
                  >
                    <span class="text-xs opacity-70">Clear selection</span>
                  </div>
                  <div
                    v-for="column in filteredPartitionColumns"
                    :key="column.name"
                    class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer"
                    @mousedown.prevent="selectPartitionColumn(column.name)"
                  >
                    {{ column.name }}
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-1">
              <label class="block text-xs font-medium text-editor-fg mb-1">Clustering</label>
              <div class="relative w-full" ref="clusterContainer">
                <input
                  id="cluster-input"
                  ref="clusterInput"
                  v-model="clusterInputValue"
                  readonly
                  placeholder="Columns..."
                  class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-6 h-6 cursor-pointer"
                  @click="isClusterDropdownOpen = !isClusterDropdownOpen"
                  @keydown.delete="removeLastClusterColumn"
                />
                <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <span class="codicon codicon-chevron-down text-xs"></span>
                </span>

                <div
                  v-if="isClusterDropdownOpen"
                  class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-60 overflow-y-auto"
                >
                  <div
                    v-for="column in props.columns"
                    :key="column.name"
                    class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer flex items-center"
                    @click="toggleClusterColumn(column.name)"
                  >
                    <span
                      class="codicon text-xs mr-2"
                      :class="isColumnSelected(column.name) ? 'codicon-check' : 'codicon-blank'"
                    ></span>
                    <span>{{ column.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

                    <div class="flex items-center gap-3">
            <label class="field-label min-w-[60px]">Secrets</label>
            <div id="secrets-container" class="flex flex-wrap items-center space-x-2 flex-1">
              <vscode-tag
                v-for="(secret, index) in (localSecrets || [])"
                :key="index"
                class="text-xs inline-flex items-center justify-center gap-1 cursor-pointer py-1"
                @click="editSecret(index)"
              >
                <div class="text-xs flex items-center gap-2">
                  <span>
                    {{ secret.secret_key }}
                    <template v-if="secret.injected_key && secret.injected_key !== secret.secret_key">
                      : {{ secret.injected_key }}
                    </template>
                  </span>
                  <span 
                    class="codicon codicon-close text-3xs flex items-center"
                    @click.stop="removeSecret(index)"
                  ></span>
                </div>
              </vscode-tag>

              <div v-if="isAddingSecret || editingSecretIndex !== -1" class="flex items-center gap-1">
                <input
                  id="secret-key-input"
                  v-model="newSecretKey"
                  @keyup.enter="confirmAddSecret"
                  @keyup.escape="cancelAddSecret"
                  ref="secretKeyInput"
                  placeholder="connection_name"
                  class="text-2xs bg-input-background focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[80px] h-6 px-1"
                />
                <span class="text-xs text-editor-fg opacity-50">:</span>
                <input
                  v-model="newSecretInjectAs"
                  @keyup.enter="confirmAddSecret"
                  @keyup.escape="cancelAddSecret"
                  placeholder="optional"
                  class="text-2xs bg-input-background focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[50px] h-6 px-1"
                />
                <vscode-button
                  id="save-secret-button"
                  appearance="icon"
                  @click="confirmAddSecret"
                  title="Save secret"
                  class="text-xs flex items-center justify-center h-6"
                >
                  <span class="codicon codicon-check"></span>
                </vscode-button>
                <vscode-button
                  appearance="icon"
                  @click="cancelAddSecret"
                  title="Cancel"
                  class="text-xs flex items-center justify-center h-6"
                >
                  <span class="codicon codicon-close"></span>
                </vscode-button>
              </div>
               
              <vscode-button
                id="add-secret-button"
                appearance="icon"
                @click="startAddingSecret"
                v-if="!isAddingSecret && editingSecretIndex === -1"
                class="text-xs flex items-center justify-center h-full"
                title="Add secret"
              >
                <span class="codicon codicon-add"></span>
              </vscode-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dependencies Section -->
      <div id="dependencies-section" class="collapsible-section overflow-visible">
        <div id="dependencies-section-header" class="section-header" @click="toggleSection('dependencies')">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-medium text-editor-fg">Dependencies</h2>
              <span
                v-if="dependencies.length > 0"
                class="inline-flex items-center justify-center w-5 h-5 text-2xs bg-badge-bg text-editor-fg rounded-full"
              >
                {{ dependencies.length }}
              </span>
            </div>
            <div class="flex items-center gap-4">
              <!-- Dependency Legend -->
              <div class="flex items-center gap-3 text-2xs text-editor-fg opacity-50">
                <div class="flex items-center gap-1">
                  <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Pipeline</span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
                  <span>External</span>
                </div>
              </div>
              <span
                id="dependencies-section-chevron"
                class="codicon transition-transform duration-200"
                :class="
                  expandedSections.dependencies ? 'codicon-chevron-down' : 'codicon-chevron-right'
                "
              ></span>
            </div>
          </div>
        </div>

        <div v-if="expandedSections.dependencies" class="section-content overflow-visible">
          <!-- Current Dependencies Display -->
          <div class="field-group">
            <label class="field-label">Current Dependencies</label>
            <div id="current-dependencies-container" class="flex flex-wrap space-x-1 min-h-[40px] bg-editorWidget-bg bg-editor-bg p-2 rounded">
              <vscode-tag
                v-for="(dep, index) in dependencies"
                :key="index"
                class="text-xs inline-flex items-center justify-center gap-1  py-1"
              >
                <div class="text-xs flex items-center gap-1">
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="dep.isExternal ? 'bg-gray-500' : 'bg-blue-500'"
                    :title="`${dep.isExternal ? 'External' : 'Pipeline'}`"
                  ></span>
                  <span id="dependency-text">{{ dep.name }}</span>
                  <span
                    class="text-2xs px-1 py-0.5 opacity-70 italic rounded bg-badge-bg cursor-pointer transition-colors duration-150 hover:bg-editorWidget-bg"
                    :title="`Mode: ${dep.mode || 'full'} (click to toggle)`"
                    @click="toggleDependencyMode(index)"
                  >
                    {{ dep.mode || 'full' }}
                  </span>
                  <span
                    id="dependency-close-icon"
                    @click="removeDependency(index)"
                    class="codicon codicon-close text-3xs cursor-pointer flex items-center"
                  ></span>
                </div>
              </vscode-tag>

              <div
                v-if="dependencies.length === 0"
                class="text-2xs text-editor-fg opacity-60 italic py-1"
              >
                No dependencies configured
              </div>
            </div>
          </div>

          <!-- Add Dependencies Controls -->
          <div class="field-group overflow-visible">
            <label class="field-label">Add Dependencies</label>
            <div class="flex gap-2 items-center">
              <!-- Pipeline Dependencies Dropdown -->
              <div class="relative flex-1 max-w-[200px] z-50" ref="pipelineDepsContainer">
                <input
                  id="pipeline-dependency-input"
                  v-model="pipelineSearchQuery"
                  placeholder="Add from pipeline..."
                  class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6 pr-6 cursor-pointer"
                  @focus="isPipelineDepsOpen = true"
                  @blur="handlePipelineInputBlur"
                  @input="handlePipelineInput"
                  @keydown.enter="handlePipelineEnter"
                  readonly
                />
                <span
                  class="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
                  @click="isPipelineDepsOpen = !isPipelineDepsOpen"
                >
                  <span class="codicon codicon-chevron-down text-xs"></span>
                </span>

                <div
                  v-if="isPipelineDepsOpen"
                  class="absolute z-[9999] w-full bg-input-background border border-commandCenter-border shadow-lg rounded max-h-60 overflow-hidden mt-1"
                  @mousedown.prevent
                >
                  <div
                    class="sticky top-0 bg-input-background border-b border-commandCenter-border px-3 py-2"
                  >
                    <input
                      v-model="pipelineSearchQuery"
                      placeholder="Search pipeline assets..."
                      class="w-full bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6 px-2 rounded"
                      @click.stop
                      @mousedown.stop
                    />
                  </div>

                  <div class="max-h-48 overflow-y-auto bg-input-background">
                    <div
                      v-for="asset in filteredPipelineAssets"
                      :key="asset.name"
                      class="flex items-center px-1 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer text-xs text-input-foreground"
                      @click="addPipelineDependency(asset)"
                    >
                      <span
                        class="codicon text-[7px] flex-shrink-0 mr-2 w-2"
                        :class="isDependencyAdded(asset.name) ? 'codicon-check' : ''"
                      ></span>
                      <span class="font-mono truncate" :title="asset.name">{{ asset.name }}</span>
                    </div>

                    <div
                      v-if="filteredPipelineAssets.length === 0"
                      class="px-3 py-2 text-xs text-input-foreground opacity-60 text-center"
                    >
                      No matching assets found
                    </div>
                  </div>
                </div>
              </div>

              <!-- External Dependency Input -->
              <div class="relative flex-1 max-w-[200px]" ref="externalDepsContainer">
                <input
                  id="external-dependency-input"
                  v-model="externalDepInput"
                  placeholder="Add external dependency..."
                  class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                  @keyup.enter="addExternalDependency"
                />
              </div>

              <!-- Fill from DB Button -->
              <vscode-button
                id="fill-from-query-button"
                v-if="isCurrentFileSql"
                appearance="secondary"
                @click="fillFromDB"
                class="text-xs flex-shrink-0"
                title="Automatically fill dependencies from database schema"
                :disabled="fillDependenciesStatus === 'loading'"
              >
                <template v-if="fillDependenciesStatus === 'loading'">
                  <svg class="animate-spin mr-1 h-4 w-4 text-editor-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </template>
                <template v-else-if="fillDependenciesStatus === 'success'">
                  <span class="codicon codicon-check text-sm mr-1 text-editor-button-fg" aria-hidden="true"></span>
                </template>
                <template v-else-if="fillDependenciesStatus === 'error'">
                  <span class="codicon codicon-error text-sm mr-1 text-editorError-foreground" aria-hidden="true"></span>
                </template>
                Fill from Query
              </vscode-button>
            </div>
            
            <!-- Error message for fill dependencies operation -->
            <div v-if="fillDependenciesMessage && fillDependenciesStatus === 'error'" class="mt-2">
              <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {{ fillDependenciesMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Materialization Section -->
      <div id="materialization-section" class="collapsible-section">
        <div id="materialization-section-header" class="section-header" @click="toggleSection('materialization')">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-medium text-editor-fg">Materialization</h2>
              <span
                v-if="localMaterialization.type !== 'null'"
                class="inline-flex items-center text-2xs text-editor-fg opacity-70"
              >
                {{ localMaterialization.type
                }}{{ localMaterialization.strategy ? ` • ${localMaterialization.strategy}` : "" }}
              </span>
            </div>
            <span
              id="materialization-section-chevron"
              class="codicon transition-transform duration-200"
              :class="
                expandedSections.materialization ? 'codicon-chevron-down' : 'codicon-chevron-right'
              "
            ></span>
          </div>
        </div>

        <div v-if="expandedSections.materialization" class="section-content">
          <!-- Materialization Type -->
          <div class="field-group">
            <label class="field-label">Type</label>
            <div class="flex space-x-6">
              <vscode-radio-group
                id="materialization-type-group"
                :value="localMaterialization.type"
                @change="(e) => setType(e.target.value)"
              >
                <vscode-radio id="materialization-type-null" name="materialization-type" value="null" :checked="localMaterialization.type === 'null'">None</vscode-radio>
                <vscode-radio id="materialization-type-table" name="materialization-type" value="table" :checked="localMaterialization.type === 'table'">Table</vscode-radio>
                <vscode-radio id="materialization-type-view" name="materialization-type" value="view" :checked="localMaterialization.type === 'view'">View</vscode-radio>
              </vscode-radio-group>
            </div>
          </div>

          <!-- Table Strategy -->
          <div v-if="localMaterialization.type === 'table'" class="field-group">
            <label class="field-label">Strategy</label>
            <div class="relative">
              <select
                id="materialization-strategy-select"
                v-model="localMaterialization.strategy"
                class="w-full max-w-[250px] bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option
                  v-for="strategy in strategyOptions"
                  :key="strategy.value"
                  :value="strategy.value"
                  class="text-xs"
                >
                  {{ strategy.label }}
                </option>
              </select>
            </div>
            <p class="text-xs text-editor-fg opacity-70 mt-1 w-full">
              {{ getStrategyDescription(localMaterialization.strategy) }}
            </p>
          </div>

          <!-- Strategy-specific Options -->
          <div v-if="showStrategyOptions" class="strategy-options">
            <div v-if="localMaterialization.strategy === 'delete+insert'" class="field-group">
              <label class="field-label">Incremental Key</label>
              <input
                id="incremental-key-input"
                class="w-full max-w-[250px] border-0 bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                v-model="localMaterialization.incremental_key"
                placeholder="column_name"
              />
            </div>

            <div v-if="localMaterialization.strategy === 'merge'" class="field-group">
              <div class="p-1 bg-editorWidget-bg rounded">
                <p id="merge-primary-key-info" class="info-text">
                  Configure primary keys in column definitions using <code>primary_key: true</code>
                </p>
              </div>
            </div>

            <div v-if="localMaterialization.strategy === 'time_interval'" class="space-y-4">
              <div class="grid grid-cols-2 items-center gap-4">
                <div class="field-group">
                  <label class="field-label">Incremental Key</label>
                  <input
                    class="w-full max-w-[250px] border-0 bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                    v-model="localMaterialization.incremental_key"
                    placeholder="column_name"
                  />
                </div>
                <div class="field-group">
                  <label class="field-label">Time Granularity</label>
                  <select
                    id="time-granularity-select"
                    v-model="localMaterialization.time_granularity"
                    class="w-full max-w-[250px] bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                  >
                    <option value="" class="text-xs opacity-60" disabled>select unit...</option>
                    <option value="date">Date</option>
                    <option value="timestamp">Timestamp</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onUnmounted } from "vue";
import { vscode } from "@/utilities/vscode";

const expandedSections = ref({
  basicInfo: true,
  dependencies: true,
  materialization: true,
  advanced: false,
});

const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section];
};

const props = defineProps({
  materialization: {
    type: Object,
    default: null,
  },
  isConfigFile: {
    type: Boolean,
    default: false,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  owner: {
    type: String,
    default: "",
  },
  tags: {
    type: Array,
    default: () => [],
  },
  dependencies: {
    type: Array,
    default: () => [],
  },
  intervalModifiers: {
    type: Object,
    default: () => ({
      start: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
      end: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
    }),
  },
  pipelineAssets: {
    type: Array,
    default: () => [],
  },
  currentFilePath: {
    type: String,
    default: "",
  },
  secrets: {
    type: Array,
    default: () => [],
  },
});

const owner = ref(props.owner || "");
const tags = ref([...props.tags] || []);
const newTag = ref("");
const isAddingTag = ref(false);
const isEditingOwner = ref(false);
const editingOwner = ref("");
const ownerInput = ref(null);
const tagInput = ref(null);
const isPartitionDropdownOpen = ref(false);
const isClusterDropdownOpen = ref(false);
const partitionContainer = ref(null);
const clusterContainer = ref(null);
const partitionInput = ref("");
const partitionDropdownStyle = ref({});
const localSecrets = ref([]);
const isAddingSecret = ref(false);
const editingSecretIndex = ref(-1);
const newSecretKey = ref("");
const newSecretInjectAs = ref("");
const secretKeyInput = ref(null);

onMounted(() => {
  if (props.secrets?.length) {
    localSecrets.value = [...props.secrets];
  }
  
  if (props.dependencies && Array.isArray(props.dependencies)) {
    dependencies.value = [...props.dependencies];
  }
  
  if (props.pipelineAssets && Array.isArray(props.pipelineAssets)) {
    pipelineAssets.value = [...props.pipelineAssets];
  }
  
  if (props.owner) {
    owner.value = props.owner;
  }
  if (props.tags && Array.isArray(props.tags)) {
    tags.value = [...props.tags];
  }
  
  if (props.intervalModifiers) {
    const clonedIntervalModifiers = JSON.parse(JSON.stringify(props.intervalModifiers || {}));
    intervalModifiers.value = {
      start: typeof clonedIntervalModifiers.start === "number"
        ? clonedIntervalModifiers.start
        : { ...(clonedIntervalModifiers.start || {}) },
      end: typeof clonedIntervalModifiers.end === "number"
        ? clonedIntervalModifiers.end
        : { ...(clonedIntervalModifiers.end || {}) }
    };
  }
  
  if (props.materialization) {
    localMaterialization.value = initializeLocalMaterialization(props.materialization);
    partitionInput.value = localMaterialization.value.partition_by || "";
    clusterInputValue.value = localMaterialization.value.cluster_by.join(", ");
  }
  
  watch(() => props.secrets, (newSecrets) => {
    if (newSecrets && Array.isArray(newSecrets)) {
      localSecrets.value = [...newSecrets];
    }
  }, { deep: true });
  
  watch(() => props.intervalModifiers, (newVal) => {
    intervalModifiers.value = {
      start: newVal?.start || null,
      end: newVal?.end || null
    };
    populateIntervalFormFields();
  }, { deep: true });
  
});

const startEditingOwner = () => {
  isEditingOwner.value = true;
  editingOwner.value = owner.value;
  nextTick(() => {
    ownerInput.value?.focus();
  });
};

const saveOwnerEdit = () => {
  owner.value = editingOwner.value.trim();
  isEditingOwner.value = false;
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      owner: owner.value,
    },
    source: "saveOwnerEdit",
  });
};

const cancelOwnerEdit = () => {
  editingOwner.value = owner.value;
  isEditingOwner.value = false;
};

const handleOwnerInputMouseLeave = () => {
  if (isEditingOwner.value) {
    saveOwnerEdit();
  }
};

const startAddingTag = () => {
  isAddingTag.value = true;
  nextTick(() => {
    tagInput.value?.focus();
  });
};

const confirmAddTag = () => {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim());
    sendTagUpdate();
  }
  newTag.value = "";
  isAddingTag.value = false;
};

const cancelAddTag = () => {
  newTag.value = "";
  isAddingTag.value = false;
};

const removeTag = (index) => {
  tags.value.splice(index, 1);
  sendTagUpdate();
};

const sendTagUpdate = () => {
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      tags: [...tags.value],
    },
    source: "saveTags",
  });
};

const dependencies = ref([]);



const isPipelineDepsOpen = ref(false);
const pipelineSearchQuery = ref("");
const externalDepInput = ref("");
const newDependencyMode = ref("full");
const pipelineDepsContainer = ref(null);
const externalDepsContainer = ref(null);
const pipelineAssets = ref([]);



const isCurrentFileSql = computed(() => {
  if (!props.currentFilePath) {
    return false;
  }

  let filePath = "";
  if (typeof props.currentFilePath === "string") {
    filePath = props.currentFilePath;
  } else if (props.currentFilePath && typeof props.currentFilePath === "object") {
    filePath = props.currentFilePath.filePath || "";
  }

  return filePath.toLowerCase().endsWith(".sql");
});

let saveTimeout = null;
let lastSavedPayload = null;

const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveMaterialization();
  }, 300);
};

const intervalModifiers = ref({});



const intervalUnits = ["months", "days", "hours", "minutes", "seconds"];

const strategyOptions = [
  { value: "create+replace", label: "Create + Replace" },
  { value: "delete+insert", label: "Delete + Insert" },
  { value: "append", label: "Append" },
  { value: "merge", label: "Merge" },
  { value: "truncate+insert", label: "Truncate + Insert" },
  { value: "time_interval", label: "Time Interval" },
  { value: "ddl", label: "DDL" },
  { value: "scd2_by_time", label: "SCD2 by Time" },
  { value: "scd2_by_column", label: "SCD2 by Column" },
];

const startIntervalValue = ref(0);
const startIntervalUnit = ref("");
const endIntervalValue = ref(0);
const endIntervalUnit = ref("");

const populateIntervalFormFields = () => {
  const currentStartInterval = intervalModifiers.value.start;
  let foundStartUnit = "";
  let foundStartValue = 0;

  if (typeof currentStartInterval === "number") {
    foundStartUnit = "cron_periods";
    foundStartValue = currentStartInterval;
  } else if (currentStartInterval && typeof currentStartInterval === "object") {
    for (const unit of intervalUnits) {
      if (
        unit !== "cron_periods" &&
        currentStartInterval[unit] !== undefined &&
        currentStartInterval[unit] !== 0
      ) {
        foundStartUnit = unit;
        foundStartValue = currentStartInterval[unit];
        break;
      }
    }
    if (!foundStartUnit && "cron_periods" in currentStartInterval) {
      foundStartUnit = "cron_periods";
      foundStartValue = currentStartInterval["cron_periods"];
    }
  }
  if (!foundStartUnit) {
    foundStartUnit = "days";
  }
  startIntervalValue.value = foundStartValue;
  startIntervalUnit.value = foundStartUnit;

  const currentEndInterval = intervalModifiers.value.end;
  let foundEndUnit = "";
  let foundEndValue = 0;

  if (typeof currentEndInterval === "number") {
    foundEndUnit = "cron_periods";
    foundEndValue = currentEndInterval;
  } else if (currentEndInterval && typeof currentEndInterval === "object") {
    for (const unit of intervalUnits) {
      if (
        unit !== "cron_periods" &&
        currentEndInterval[unit] !== undefined &&
        currentEndInterval[unit] !== 0
      ) {
        foundEndUnit = unit;
        foundEndValue = currentEndInterval[unit];
        break;
      }
    }
    if (!foundEndUnit && "cron_periods" in currentEndInterval) {
      foundEndUnit = "cron_periods";
      foundEndValue = currentEndInterval["cron_periods"];
    }
  }
  if (!foundEndUnit) {
    foundEndUnit = "days";
  }
  endIntervalValue.value = foundEndValue;
  endIntervalUnit.value = foundEndUnit;
};

const handleIntervalChange = (intervalType) => {
  const currentUnit = intervalType === "start" ? startIntervalUnit.value : endIntervalUnit.value;
  const currentVal =
    Number(intervalType === "start" ? startIntervalValue.value : endIntervalValue.value) || 0;

  let newIntervalState;
  if (currentUnit === "cron_periods") {
    newIntervalState = currentVal;
  } else {
    newIntervalState = {};
    for (const unit of intervalUnits.filter((u) => u !== "cron_periods")) {
      newIntervalState[unit] = 0;
    }
    if (currentUnit) {
      newIntervalState[currentUnit] = currentVal;
    }
  }
  intervalModifiers.value[intervalType] = newIntervalState;

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      interval_modifiers: JSON.parse(JSON.stringify(intervalModifiers.value)),
    },
    source: `Materialization_handleIntervalChange_${intervalType}`,
  });
};

onMounted(() => {
  watch(
    () => props.intervalModifiers,
    (newVal) => {
      const clonedNewVal = JSON.parse(JSON.stringify(newVal || {}));

      intervalModifiers.value = {
        start:
          typeof clonedNewVal.start === "number"
            ? clonedNewVal.start
            : { ...(clonedNewVal.start || {}) },
        end:
          typeof clonedNewVal.end === "number" ? clonedNewVal.end : { ...(clonedNewVal.end || {}) },
      };

      populateIntervalFormFields();
    },
    { deep: true }
  );
});

const defaultMaterialization = {
  type: "null",
  strategy: undefined,
  partition_by: "",
  cluster_by: [],
  incremental_key: "",
  time_granularity: undefined,
};

const localMaterialization = ref({ ...defaultMaterialization });
const showStrategyOptions = computed(() => {
  return localMaterialization.value.type === "table" && localMaterialization.value.strategy;
});

const initializeLocalMaterialization = (materializationProp) => {
  if (materializationProp === null) {
    return { ...defaultMaterialization };
  }
  const base = JSON.parse(JSON.stringify(materializationProp));
  if (base.type === "table" && !base.strategy) {
    base.strategy = "create+replace";
  }
  base.cluster_by = Array.isArray(base.cluster_by)
    ? base.cluster_by
    : typeof base.cluster_by === "string"
      ? base.cluster_by
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c)
      : [];
  return base;
};

onMounted(() => {
  // Initialize materialization on mount
  localMaterialization.value = initializeLocalMaterialization(props.materialization);
  partitionInput.value = localMaterialization.value.partition_by || "";
  clusterInputValue.value = localMaterialization.value.cluster_by.join(", ");
  
  watch(
    () => props.materialization,
    (newVal) => {
      localMaterialization.value = initializeLocalMaterialization(newVal);
      partitionInput.value = localMaterialization.value.partition_by || "";
      clusterInputValue.value = localMaterialization.value.cluster_by.join(", ");
    },
    { deep: true }
  );
});

watch(
  () => localMaterialization.value.strategy,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

watch(
  () => localMaterialization.value.incremental_key,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

watch(
  () => localMaterialization.value.time_granularity,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

watch(
  () => localMaterialization.value.partition_by,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

watch(
  () => localMaterialization.value.cluster_by,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  },
  { deep: true }
);

watch(
  () => localMaterialization.value.type,
  () => {
    debouncedSave();
  }
);

watch(
  () => localMaterialization.value.partition_by,
  (newPartitionBy) => {
    partitionInput.value = newPartitionBy || "";
  }
);

watch(
  () => localMaterialization.value.cluster_by,
  (newClusterBy) => {
    clusterInputValue.value = newClusterBy.join(", ");
  },
  { deep: true }
);


const setType = (type) => {
  if (type === "null") {
    localMaterialization.value = { ...defaultMaterialization };
  } else {
    if (localMaterialization.value.type === "null") {
      localMaterialization.value = {
        type: type,
        strategy: type === "table" ? "create+replace" : undefined,
        partition_by: "",
        cluster_by: [],
      };
    } else {
      localMaterialization.value.type = type;
      if (type === "table" && !localMaterialization.value.strategy) {
        localMaterialization.value.strategy = "create+replace";
      }
    }
  }
};

const handleClickOutside = (event) => {
  if (partitionContainer.value && !partitionContainer.value.contains(event.target)) {
    isPartitionDropdownOpen.value = false;
  }
  if (clusterContainer.value && !clusterContainer.value.contains(event.target)) {
    isClusterDropdownOpen.value = false;
  }

  if (pipelineDepsContainer.value && !pipelineDepsContainer.value.contains(event.target)) {
    const dropdownElement = document.querySelector(".fixed.z-\\[9999\\]");
    if (!dropdownElement || !dropdownElement.contains(event.target)) {
      isPipelineDepsOpen.value = false;
    }
  }
};

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
  window.addEventListener("message", handleMessage);
  populateIntervalFormFields();
  vscode.postMessage({
    command: "bruin.getPipelineAssets",
    source: "Materialization",
  });
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleClickOutside);

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
});

const saveMaterialization = () => {
  const payload = {};
  
  if (intervalModifiers.value) {
    // Properly serialize interval_modifiers to avoid Proxy issues
    const serializedIntervalModifiers = JSON.parse(JSON.stringify(intervalModifiers.value));
    payload.interval_modifiers = {
      start: serializedIntervalModifiers.start || null,
      end: serializedIntervalModifiers.end || null
    };
  }

  if (localMaterialization.value?.type) {
    if (localMaterialization.value.type === "null") {
      payload.materialization = null;
    } else {
      // Properly serialize materialization to avoid Proxy issues
      const serializedMaterialization = JSON.parse(JSON.stringify(localMaterialization.value));
      payload.materialization = {
        type: serializedMaterialization.type,
        partition_by: serializedMaterialization.partition_by || null,
        cluster_by: Array.isArray(serializedMaterialization.cluster_by) 
          ? [...serializedMaterialization.cluster_by] 
          : [],
        incremental_key: serializedMaterialization.incremental_key || null,
        time_granularity: serializedMaterialization.time_granularity || null
      };
      
      if (serializedMaterialization.type === "table") {
        payload.materialization.strategy = serializedMaterialization.strategy || null;
      } else if (serializedMaterialization.type === "view") {
        payload.materialization.strategy = "";
      }
    }
  }

  // Only send if payload has actually changed to prevent infinite loops
  const currentPayloadString = JSON.stringify(payload);
  if (currentPayloadString === lastSavedPayload) {
    return;
  }
  
  lastSavedPayload = currentPayloadString;

  try {
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: payload,
      source: "Materialization_autoSave",
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    console.error('Payload that failed:', payload);
  }
};

const sendSecretsUpdate = () => {
  const sanitized = (localSecrets.value || [])
    .filter(secret => secret?.secret_key?.trim())
    .map(secret => ({
      secret_key: secret.secret_key,
      ...(secret.injected_key && secret.injected_key.trim() && secret.injected_key !== secret.secret_key
        ? { injected_key: secret.injected_key }
        : {})
    }));

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: { secrets: sanitized },
    source: "Materialization_saveSecrets",
  });
};

// (No single-secret send; we always send current list)

function getStrategyDescription(strategy) {
  return {
    "create+replace": "Drop and recreate the table completely",
    "delete+insert": "Delete existing data using incremental key and insert new records",
    "append": "Add new rows without modifying existing data",
    "merge": "Update existing rows and insert new ones using primary keys",
    "truncate+insert": "Truncate the table and insert new data",
    "time_interval": "Process time-based data using incremental key",
    "ddl":
      "Use DDL to create a new table using the information provided in the embedded Bruin section",
  }[strategy];
}

const filteredPipelineAssets = computed(() => {
  const query = pipelineSearchQuery.value.toLowerCase();
  if (!query) {
    return pipelineAssets.value;
  }

  return pipelineAssets.value.filter((asset) => asset.name.toLowerCase().includes(query));
});

const addPipelineDependency = (asset) => {
  if (!dependencies.value.some((dep) => dep.name === asset.name)) {
    dependencies.value.push({
      name: asset.name,
      isExternal: false,
      type: "asset",
      mode: newDependencyMode.value,
    });
    sendDependenciesUpdate();
  }
  isPipelineDepsOpen.value = false;
  pipelineSearchQuery.value = "";
};

const addExternalDependency = () => {
  const depName = externalDepInput.value.trim();
  if (depName && !dependencies.value.some((dep) => dep.name === depName)) {
    dependencies.value.push({
      name: depName,
      isExternal: true,
      type: "external",
      mode: newDependencyMode.value,
    });
    sendDependenciesUpdate();
  }
  externalDepInput.value = "";
};

const removeDependency = (index) => {
  dependencies.value.splice(index, 1);
  sendDependenciesUpdate();
};

const isDependencyAdded = (assetName) => {
  return dependencies.value.some((dep) => dep.name === assetName);
};

let lastSentDependencies = null;

const sendDependenciesUpdate = () => {
  const upstreams = dependencies.value.map((dep) => ({
    type: dep.isExternal ? "external" : "asset",
    value: dep.name,
    mode: dep.mode || "full",
  }));

  // Only send if dependencies have actually changed to prevent infinite loops
  const currentDepsString = JSON.stringify(upstreams);
  if (currentDepsString === lastSentDependencies) {
    return;
  }
  
  lastSentDependencies = currentDepsString;

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      upstreams: upstreams,
    },
    source: "saveDependencies",
  });
};

const toggleDependencyMode = (index) => {
  const dep = dependencies.value[index];
  const newMode = dep.mode === "full" ? "symbolic" : "full";
  dependencies.value[index].mode = newMode;
  sendDependenciesUpdate();
};

const fillDependenciesStatus = ref(null);
const fillDependenciesMessage = ref(null);

const fillFromDB = () => {
  fillDependenciesStatus.value = "loading";
  fillDependenciesMessage.value = null;
  vscode.postMessage({
    command: "bruin.fillAssetDependency",
    source: "Materialization_fillFromDB",
  });
};

const handleMessage = (event) => {
  const envelope = event.data;
  
  switch (envelope.command) {
    case "fill-dependencies-message":
      if (envelope.payload.status === "loading") {
        fillDependenciesStatus.value = "loading";
        fillDependenciesMessage.value = envelope.payload.message;
      } else if (envelope.payload.status === "success") {
        fillDependenciesStatus.value = "success";
        fillDependenciesMessage.value = envelope.payload.message;
        setTimeout(() => {
          fillDependenciesStatus.value = null;
          fillDependenciesMessage.value = null;
        }, 10000);
      } else if (envelope.payload.status === "error") {
        fillDependenciesStatus.value = "error";
        fillDependenciesMessage.value = envelope.payload.message;
      }
      break;
  }
};

watch(
  () => props.dependencies,
  (newDeps) => {
    console.log("Dependencies prop changed:", newDeps);
    const transformedDeps = (newDeps || []).map(dep => ({
      name: dep.value || dep.name,
      isExternal: dep.type === 'external' || dep.type !== 'asset',
      type: dep.type,
      mode: dep.mode || 'full',
    }));
    
    // Only update if the dependencies have actually changed to prevent infinite loops
    const currentDeps = dependencies.value || [];
    const hasChanged = JSON.stringify(transformedDeps) !== JSON.stringify(currentDeps);
    
    if (hasChanged) {
      dependencies.value = transformedDeps;
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.owner,
  (newOwner) => {
    owner.value = newOwner || "";
  },
  { immediate: true }
);

watch(
  () => props.tags,
  (newTags) => {
    tags.value = [...newTags] || [];
  },
  { immediate: true, deep: true }
);

watch(
  () => props.pipelineAssets,
  (newPipelineAssets) => {
    console.log("PipelineAssets prop changed, count:", newPipelineAssets?.length);
    pipelineAssets.value = [...newPipelineAssets] || [];
  },
  { immediate: true, deep: true }
);

watch(isPipelineDepsOpen, (isOpen) => {
  if (!isOpen) {
    pipelineSearchQuery.value = "";
  }
});

const handlePipelineInput = () => {
  isPipelineDepsOpen.value = true;
};

const handlePipelineInputBlur = () => {

};

const handlePipelineEnter = () => {
  isPipelineDepsOpen.value = false;
};



const filteredPartitionColumns = computed(() => {
  const query = partitionInput.value.toLowerCase();
  if (!query || isPartitionDropdownOpen.value) {
    return props.columns;
  }
  return props.columns.filter((column) => column.name.toLowerCase().includes(query));
});

const clusterInputValue = computed(() => {
  return localMaterialization.value.cluster_by.join(", ") || "";
});

const selectPartitionColumn = (columnName) => {
  if (columnName === "") {
    localMaterialization.value.partition_by = "";
    partitionInput.value = "";
  } else {
    localMaterialization.value.partition_by = columnName;
    partitionInput.value = columnName;
  }
  isPartitionDropdownOpen.value = false;
  debouncedSave();
};

const handlePartitionInput = () => {
  localMaterialization.value.partition_by = partitionInput.value;
  isPartitionDropdownOpen.value = true;
  
  debouncedSave();
};

const handlePartitionInputBlur = () => {
  setTimeout(() => {
    isPartitionDropdownOpen.value = false;
  }, 100);
};

const handlePartitionEnter = () => {
  isPartitionDropdownOpen.value = false;
};

const isColumnSelected = (columnName) => {
  return localMaterialization.value.cluster_by?.includes(columnName);
};

const toggleClusterColumn = (columnName) => {
  if (!localMaterialization.value.cluster_by) {
    localMaterialization.value.cluster_by = [];
  }

  const index = localMaterialization.value.cluster_by.indexOf(columnName);
  if (index > -1) {
    localMaterialization.value.cluster_by.splice(index, 1);
  } else {
    localMaterialization.value.cluster_by.push(columnName);
  }
  
  debouncedSave();
};

const removeLastClusterColumn = () => {
  if (localMaterialization.value.cluster_by.length > 0) {
    localMaterialization.value.cluster_by.pop();
    debouncedSave();
  }
};

const startAddingSecret = () => {
  isAddingSecret.value = true;
  editingSecretIndex.value = -1;
  newSecretKey.value = "";
  newSecretInjectAs.value = "";
  nextTick(() => {
    secretKeyInput.value?.focus();
  });
};

const editSecret = (index) => {
  const secret = localSecrets.value[index];
  isAddingSecret.value = false;
  editingSecretIndex.value = index;
  newSecretKey.value = secret.secret_key;
  newSecretInjectAs.value = secret.injected_key || "";
  nextTick(() => {
    secretKeyInput.value?.focus();
  });
};

const confirmAddSecret = () => {
  if (newSecretKey.value.trim()) {
    if (!localSecrets.value) {
      localSecrets.value = [];
    }
    const secretData = {
      secret_key: newSecretKey.value.trim()
    };
    if (newSecretInjectAs.value.trim()) {
      secretData.injected_key = newSecretInjectAs.value.trim();
    }
    if (editingSecretIndex.value !== -1) {
      localSecrets.value[editingSecretIndex.value] = secretData;
    } else {
      localSecrets.value.push(secretData);
    }
    // Send full list to preserve existing secrets
    sendSecretsUpdate();
  }
  
  newSecretKey.value = "";
  newSecretInjectAs.value = "";
  isAddingSecret.value = false;
  editingSecretIndex.value = -1;
};

const cancelAddSecret = () => {
  newSecretKey.value = "";
  newSecretInjectAs.value = "";
  isAddingSecret.value = false;
  editingSecretIndex.value = -1;
};

const removeSecret = (index) => {
  if (localSecrets.value && Array.isArray(localSecrets.value)) {
    localSecrets.value.splice(index, 1);
    sendSecretsUpdate();
  }
};



</script>

<style scoped>
/* Collapsible sections */
.collapsible-section {
  @apply border border-commandCenter-border rounded;
}

.collapsible-section.overflow-visible {
  overflow: visible !important;
}

.section-header {
  @apply p-1 bg-editorWidget-bg border-inherit cursor-pointer hover:bg-input-background transition-colors duration-150 rounded-t;
}

.section-content {
  @apply p-2 space-y-2 bg-editor-bg border-t border-commandCenter-border rounded-b;
}

/* Field styling */
.field-group {
  @apply space-y-2;
}

.field-label {
  @apply block text-xs font-medium text-editor-fg min-w-[60px];
}

/* Strategy options styling */
.strategy-options {
  @apply pl-2 border-commandCenter-border space-y-2 bg-editorWidget-bg p-2 rounded;
}

/* Original input styling without borders */
vscode-radio::part(control) {
  @apply border-none outline-none w-4 h-4;
}

vscode-radio::part(control):checked {
  @apply bg-input-background;
}

input,
select {
  @apply text-sm bg-input-background text-input-foreground border-0 outline-none;
}

input:focus,
select:focus {
  @apply ring-1 ring-editorLink-activeFg;
}

input:disabled,
select:disabled {
  @apply opacity-50 cursor-not-allowed;
}

vscode-tag {
  @apply text-xs;
}

vscode-tag::part(control) {
  @apply normal-case !important;
}

.info-text {
  @apply text-xs text-editor-fg opacity-70;
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

#owner-text-container.hover-background:hover {
  background-color: var(--vscode-input-background);
}

/* Transitions */
.codicon {
  transition: transform 0.2s ease;
}
select {
  @apply text-xs p-1;
}
</style>

