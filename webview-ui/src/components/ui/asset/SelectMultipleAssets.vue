<template>
    <div v-if="isOpen" class="mt-2 flex flex-col">
        <!-- Header row with controls -->
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
                <span class="text-xs text-editor-fg opacity-70">Select assets</span>
                <div class="flex items-center gap-1 text-2xs">
                    <button @click="selectAll" class="text-editorLink-activeFg hover:underline">All</button>
                    <span class="text-editor-fg opacity-30">|</span>
                    <button @click="clearAll" class="text-editorLink-activeFg hover:underline">Clear</button>
                    <span class="text-editor-fg opacity-30">|</span>
                    <button @click="invertSelection" class="text-editorLink-activeFg hover:underline">Invert</button>
                </div>
            </div>
            <button @click="$emit('close')" class="text-editor-fg opacity-50 hover:opacity-100" title="Close">
                <span class="codicon codicon-close text-xs"></span>
            </button>
        </div>

        <!-- Search -->
        <input v-model="searchQuery" type="text" placeholder="Search assets..."
            class="w-full px-2 py-1 text-xs bg-sideBar-bg text-editor-fg border border-commandCenter-border rounded focus:outline-none mb-1" />

        <!-- Asset list with table header -->
        <div class="border border-commandCenter-border rounded bg-sideBar-bg overflow-hidden flex flex-col">
            <!-- Table header - sticky -->
            <div class="flex items-center px-2 py-1 bg-editorWidget-bg border-b border-commandCenter-border text-2xs text-editor-fg opacity-70 flex-shrink-0">
                <div class="flex-1 min-w-0">Asset</div>
                <div class="w-20 text-center flex-shrink-0 leading-tight">
                    <div>Direct</div>
                    <div class="opacity-60">Downstream</div>
                </div>
                <div class="w-20 text-center flex-shrink-0 leading-tight">
                    <div>All</div>
                    <div class="opacity-60">Downstream</div>
                </div>
            </div>

            <!-- Scrollable content -->
            <div class="max-h-44 overflow-y-auto flex-1">
                <div v-if="loading" class="text-center text-editor-fg opacity-60 py-4 text-xs">
                    Loading assets...
                </div>
                <template v-else>
                    <div v-for="asset in filteredAssets" :key="asset.name"
                        class="flex items-center px-2 py-1 hover:bg-list-hoverBackground border-b border-commandCenter-border last:border-b-0 group">
                        <!-- Asset checkbox -->
                        <div class="flex-1 min-w-0">
                            <vscode-checkbox :checked="isAssetSelected(asset.name)"
                                @change="handleAssetToggle(asset.name, $event)" class="text-xs">
                                <span class="font-mono truncate block max-w-full">
                                    {{ asset.name }}
                                </span>
                            </vscode-checkbox>
                        </div>
                        <!-- Direct downstreams button -->
                        <div class="w-20 text-center flex-shrink-0">
                            <button
                                v-if="isAssetSelected(asset.name)"
                                @click.stop="addDirectDownstreams(asset.name)"
                                class="text-2xs px-1.5 py-0.5 rounded transition-colors"
                                :class="hasDownstreams(asset.name, 'direct')
                                    ? 'text-editorLink-activeFg hover:bg-list-hoverBackground'
                                    : 'text-editor-fg opacity-30 cursor-not-allowed'"
                                :disabled="!hasDownstreams(asset.name, 'direct')"
                                :title="hasDownstreams(asset.name, 'direct') ? 'Add direct downstream assets' : 'No direct downstreams'">
                                <span class="codicon codicon-arrow-right"></span>
                            </button>
                        </div>
                        <!-- All downstreams button -->
                        <div class="w-20 text-center flex-shrink-0">
                            <button
                                v-if="isAssetSelected(asset.name)"
                                @click.stop="addAllDownstreams(asset.name)"
                                class="text-2xs px-1.5 py-0.5 rounded transition-colors"
                                :class="hasDownstreams(asset.name, 'all')
                                    ? 'text-editorLink-activeFg hover:bg-list-hoverBackground'
                                    : 'text-editor-fg opacity-30 cursor-not-allowed'"
                                :disabled="!hasDownstreams(asset.name, 'all')"
                                :title="hasDownstreams(asset.name, 'all') ? 'Add all downstream assets' : 'No downstreams'">
                                <span class="codicon codicon-arrow-down"></span>
                            </button>
                        </div>
                    </div>
                    <div v-if="filteredAssets.length === 0" class="text-center text-editor-fg opacity-50 py-3 text-xs">
                        {{ assets.length === 0 ? 'No assets found in pipeline' : 'No matching assets' }}
                    </div>
                </template>
            </div>

            <!-- Footer - sticky at bottom -->
            <div class="flex items-center justify-between px-2 py-1.5 bg-editorWidget-bg border-t border-commandCenter-border flex-shrink-0">
                <span class="text-xs text-editor-fg opacity-60">
                    {{ selectedCount }} selected
                    <span v-if="fullRefreshEnabled && selectedCount > 0" class="text-2xs opacity-70">
                        (full refresh)
                    </span>
                </span>
                <vscode-button @click="applySelection" :disabled="selectedCount === 0" class="text-xs h-6">
                    <div class="flex items-center justify-center">
                        <span class="codicon codicon-check mr-1"></span>
                        <span>Apply</span>
                    </div>
                </vscode-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { findDownstreamAssets, fetchAllDownstreams } from '@/utilities/assetDependencies';
import { usePipelineRunStore } from '@/store/bruinStore';

interface Asset {
    name: string;
    id?: string;
    definition_file?: { path: string };
}

export interface SelectedAssetWithSettings {
    name: string;
    definition_file?: { path: string };
    fullRefresh: boolean;
}

const props = defineProps<{
    isOpen: boolean;
    assets: Asset[];
    loading?: boolean;
    initialSelected?: SelectedAssetWithSettings[];
    fullRefreshEnabled?: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'run', assets: SelectedAssetWithSettings[]): void;
}>();

const pipelineRunStore = usePipelineRunStore();

// Map of asset name -> { selected, fullRefresh, isDownstream }
const assetSettings = ref<Map<string, { selected: boolean; fullRefresh: boolean; isDownstream?: boolean }>>(new Map());
const searchQuery = ref('');

const filteredAssets = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return props.assets;
    return props.assets.filter((asset) =>
        asset.name.toLowerCase().includes(query)
    );
});

const selectedCount = computed(() => {
    return Array.from(assetSettings.value.values()).filter(s => s.selected).length;
});

const fullRefreshEnabled = computed(() => {
    return props.fullRefreshEnabled || false;
});

const isAssetSelected = (name: string) => {
    return assetSettings.value.get(name)?.selected ?? false;
};

const isDownstreamAsset = (name: string) => {
    return assetSettings.value.get(name)?.isDownstream ?? false;
};

const hasDownstreams = (assetName: string, type: 'direct' | 'all'): boolean => {
    if (type === 'direct') {
        const downstreams = findDownstreamAssets(assetName, props.assets);
        return downstreams.length > 0;
    } else {
        const allDownstreams = fetchAllDownstreams(assetName, props.assets, []);
        return allDownstreams.filter(a => a.name !== assetName).length > 0;
    }
};

const handleAssetToggle = (assetName: string, event: any) => {
    const isChecked = event.target.checked;
    const current = assetSettings.value.get(assetName) || { selected: false, fullRefresh: false, isDownstream: false };
    // Apply full-refresh based on the main checkbox state
    // Keep isDownstream flag if it was set
    assetSettings.value.set(assetName, { 
        selected: isChecked, 
        fullRefresh: isChecked && fullRefreshEnabled.value,
        isDownstream: isChecked ? current.isDownstream : false
    });
    // Trigger reactivity
    assetSettings.value = new Map(assetSettings.value);
};

const addDirectDownstreams = (assetName: string) => {
    const downstreamAssets = findDownstreamAssets(assetName, props.assets);
    
    if (downstreamAssets.length === 0) return;
    
    let addedCount = 0;
    downstreamAssets.forEach((asset) => {
        // Skip if it's the same asset
        if (asset.name === assetName) return;
        
        const current = assetSettings.value.get(asset.name) || { selected: false, fullRefresh: false, isDownstream: false };
        const wasAlreadySelected = current.selected;
        
        assetSettings.value.set(asset.name, {
            selected: true,
            fullRefresh: current.selected ? current.fullRefresh : fullRefreshEnabled.value,
            isDownstream: true
        });
        
        if (!wasAlreadySelected) {
            addedCount++;
        }
    });
    
    // Trigger reactivity
    assetSettings.value = new Map(assetSettings.value);
};

const addAllDownstreams = (assetName: string) => {
    // Get all downstream assets recursively (excluding the original asset)
    const allDownstreamAssets = fetchAllDownstreams(assetName, props.assets, []);
    
    // Filter out the original asset
    const downstreams = allDownstreamAssets.filter(asset => asset.name !== assetName);
    
    if (downstreams.length === 0) return;
    
    downstreams.forEach((asset) => {
        const current = assetSettings.value.get(asset.name) || { selected: false, fullRefresh: false, isDownstream: false };
        assetSettings.value.set(asset.name, {
            selected: true,
            fullRefresh: current.selected ? current.fullRefresh : fullRefreshEnabled.value,
            isDownstream: true
        });
    });
    
    // Trigger reactivity
    assetSettings.value = new Map(assetSettings.value);
};

const selectAll = () => {
    filteredAssets.value.forEach((asset) => {
        const current = assetSettings.value.get(asset.name) || { selected: false, fullRefresh: false, isDownstream: false };
        assetSettings.value.set(asset.name, { 
            selected: true, 
            fullRefresh: fullRefreshEnabled.value,
            isDownstream: current.isDownstream
        });
    });
    assetSettings.value = new Map(assetSettings.value);
};

const clearAll = () => {
    assetSettings.value.forEach((settings, name) => {
        assetSettings.value.set(name, { ...settings, selected: false });
    });
    assetSettings.value = new Map(assetSettings.value);
};

const invertSelection = () => {
    filteredAssets.value.forEach((asset) => {
        const current = assetSettings.value.get(asset.name) || { selected: false, fullRefresh: false, isDownstream: false };
        assetSettings.value.set(asset.name, { 
            selected: !current.selected, 
            fullRefresh: !current.selected && fullRefreshEnabled.value,
            isDownstream: !current.selected ? current.isDownstream : false
        });
    });
    assetSettings.value = new Map(assetSettings.value);
};

// Sync current selection to the store (for real-time Run button update)
const syncToStore = () => {
    const selectedAssets: SelectedAssetWithSettings[] = [];

    props.assets.forEach((asset) => {
        const settings = assetSettings.value.get(asset.name);
        if (settings?.selected) {
            selectedAssets.push({
                name: asset.name,
                definition_file: asset.definition_file,
                fullRefresh: settings.fullRefresh,
            });
        }
    });

    pipelineRunStore.setSelectedAssets(selectedAssets);
};

const applySelection = () => {
    syncToStore();
    emit('close');
};

// Watch for full-refresh changes and update all selected assets
watch(
    () => props.fullRefreshEnabled,
    (enabled) => {
        assetSettings.value.forEach((settings, name) => {
            if (settings.selected) {
                assetSettings.value.set(name, { ...settings, fullRefresh: enabled });
            }
        });
        assetSettings.value = new Map(assetSettings.value);
    }
);

// Sync to store in real-time whenever selection changes
watch(
    assetSettings,
    () => {
        if (props.isOpen) {
            syncToStore();
        }
    },
    { deep: true }
);

// Initialize selection when dialog opens
watch(
    () => props.isOpen,
    (isOpen) => {
        if (isOpen) {
            // Initialize from initialSelected or start fresh
            const newSettings = new Map<string, { selected: boolean; fullRefresh: boolean; isDownstream?: boolean }>();

            if (props.initialSelected && props.initialSelected.length > 0) {
                props.initialSelected.forEach((asset) => {
                    const current = assetSettings.value.get(asset.name);
                    newSettings.set(asset.name, { 
                        selected: true, 
                        fullRefresh: fullRefreshEnabled.value || asset.fullRefresh,
                        isDownstream: current?.isDownstream || false
                    });
                });
            }

            assetSettings.value = newSettings;
            searchQuery.value = '';
        }
    }
);
</script>
<style scoped>

vscode-button::part(control) {
    @apply border-none pl-1.5;
}
</style>