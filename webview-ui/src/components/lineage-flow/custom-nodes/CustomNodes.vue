<template>
  <div class="custom-node-wrapper">
    <div
      v-if="showUpstreamIcon"
      @click.stop="onAddUpstream"
      class="icon-wrapper left-icon bg-commandCenter-border"
      :class="{ invisible: !props.data.hasUpstreamForClicking }"
      title="Show Upstreams"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>

    <div class="node-content" :class="assetClass" @click="togglePopup">
      <div
        v-if="data.type === 'asset'"
        :class="assetHighlightClass"
      >
        <div class="flex justify-between" :class="selectedStatusStyle">
          <div class="flex items-center px-2 font-mono text-sm font-semibold space-x-1">
            <div
              v-if="status === 'running'"
              class="flex-none rounded-full p-0.5 animate-pulse bg-yellow-400"
            >
              <div class="h-1 w-1 rounded-full bg-yellow-500" />
            </div>
            <div>
              <p class="">{{ status }}</p>
            </div>
          </div>
          <div
            class="text-center rounded-t px-2 font-mono text-sm truncate border-t border-white/20"
            :class="selectedStyle.label"
          >
            {{ data.asset?.type }}
          </div>
        </div>

        <div
          class="rounded-b font-mono py-1 text-left px-1 border border-white/20"
          :class="[selectedStyle.main, status ? '' : 'rounded-tl']"
        >
          <div class="relative group">
            <!-- Truncated Text -->
            <div class="truncate">
              {{ label }}
            </div>

            <!-- Tooltip -->
            <div
              v-if="isTruncated"
              class="absolute left-0 top-0 w-max px-2 text-sm rounded opacity-0 py-1 group-hover:opacity-100 transition-opacity duration-200 group-hover:cursor-pointer"
              :class="selectedStyle.main"
            >
              {{ label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showDownstreamIcon"
      @click.stop="onAddDownstream"
      class="icon-wrapper right-icon bg-commandCenter-border"
      title="Show Downstreams"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>
    <AssetProperties
      v-if="!data.asset?.isFocusAsset"
      :show="showPopup"
      :name="props.data.asset?.name || ''"
      :type="props.data.asset?.type || ''"
      :path="props.data.asset?.path || ''"
      @close="closePopup"
      @goToDetails="handleGoToDetails"
    />
  </div>
  <Handle
    v-if="assetHasDownstreams || assetHasUpstreams"
    type="source"
    class="opacity-0"
    :position="Position.Right"
  />
  <Handle
    v-if="assetHasUpstreams || assetHasDownstreams"
    type="target"
    class="opacity-0"
    :position="Position.Left"
  />
</template>

<script lang="ts" setup>
import { computed, defineProps, defineEmits, onMounted, onUnmounted } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { PlusIcon } from "@heroicons/vue/20/solid";
import type { BruinNodeProps } from "@/types";
import AssetProperties from "@/components/ui/asset/AssetProperties.vue";
import { vscode } from "@/utilities/vscode";
import {
  defaultStyle,
  statusStyles,
  styles,
} from "@/components/lineage-flow/custom-nodes/CustomNodeStyles";

const props = defineProps<BruinNodeProps & {
  selectedNodeId: string | null;
}>();
const emit = defineEmits(["add-upstream", "add-downstream", "node-click"]);

const selectedStyle = computed(() => styles[props.data?.asset?.type || "default"] || defaultStyle);
const selectedStatusStyle = computed(() => statusStyles[props.status || ""]);
const isAsset = computed(() => props.data.type === "asset");

const assetHasUpstreams = computed(() => isAsset.value && props.data.asset?.hasUpstreams !== undefined);
const assetHasDownstreams = computed(() => isAsset.value && props.data.asset?.hasDownstreams);

const showUpstreamIcon = computed(() => isAsset.value && props.data?.hasUpstreamForClicking);
const showDownstreamIcon = computed(() => isAsset.value && props.data?.hasDownstreamForClicking);

const isTruncated = computed(() => (props.data.asset?.name?.length || 0) > 26);
const assetClass = computed(() => `rounded w-56 ${props.status ? selectedStatusStyle.value : ''}`);

const assetHighlightClass = computed(() => {
  return props.data.asset?.isFocusAsset
    ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 rounded'
    : '';
});

const onAddUpstream = () => emit("add-upstream", props.data.asset?.name);
const onAddDownstream = () => emit("add-downstream", props.data.asset?.name);

const showPopup = computed(() => props.selectedNodeId === props.data.asset?.name && !props.data.asset?.isFocusAsset);
const togglePopup = (event: MouseEvent) => {
  event.stopPropagation();
  emit("node-click", props.data.asset?.name, event);
};

const closePopup = () => emit("node-click", null, new MouseEvent('click'));

const handleGoToDetails = (asset: any) => {
  vscode.postMessage({ command: "bruin.openAssetDetails", payload: asset.path });
  closePopup();
};

const handleClickOutside = (event: MouseEvent) => {
  if (showPopup.value) closePopup();
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
<style scoped>
.custom-node-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.node-content {
  width: 224px; /* 14rem */
}

.icon-wrapper {
  position: absolute;
  top: 72%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(55, 65, 81, 0.3);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
}

.icon-wrapper:hover {
  border-color: rgba(55, 65, 81, 0.5);
}

.left-icon {
  left: -28px;
}

.right-icon {
  right: -28px;
}
</style>
