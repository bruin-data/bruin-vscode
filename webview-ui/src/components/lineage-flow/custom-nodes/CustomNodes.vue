<template>
  <div class="custom-node-wrapper">
    <div
      v-if="showUpstreamIcon"
      @click.stop="onAddUpstream"
      class="icon-wrapper left-icon"
      :class="props.data.hasUpstreamForClicking ? '' : 'invisible'"
      title="Show Upstreams"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>

    <div class="node-content" :class="assetClass">
      <div
        v-if="data.type === 'asset'"
        :class="[
          props.data.asset?.isFocusAsset
            ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 rounded'
            : '',
          data.highlight ? '' : '',
        ]"
      >
        <div class="flex justify-between" :class="status ? selectedStatusStyle : ''">
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
          <div class="truncate">
            {{ label }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showDownstreamIcon"
      @click.stop="onAddDownstream"
      class="icon-wrapper right-icon"
      title="Show Downstreams"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>
  </div>
  <Handle v-if="assetHasDownstreams || assetHasUpstreams" type="source" class="opacity-0" :position="Position.Right" />
  <Handle v-if="assetHasUpstreams || assetHasDownstreams" type="target" class="opacity-0" :position="Position.Left" />

  

</template>

<script lang="ts" setup>
import { computed, defineProps, defineEmits } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { PlusIcon } from "@heroicons/vue/20/solid";
import type { BruinNodeProps } from "@/types";
import {
  defaultStyle,
  statusStyles,
  styles,
} from "@/components/lineage-flow/custom-nodes/CustomNodeStyles";
const props = defineProps<BruinNodeProps>();

const selectedStyle = computed(() => {
  if (props.data?.type === "project") {
    console.log("Project", props.data?.type);
    return defaultStyle;
  }

  return styles[props.data?.asset?.type!!] || defaultStyle;
});

const selectedStatusStyle = computed(() => {
  return statusStyles[props.status || "unknown"];
});

const isAsset = computed(() => props.data.type === "asset");

const assetHasUpstreams = computed(() => {
  const result = isAsset.value && props.data.asset?.hasUpstreams;
  console.log(`Asset ${props.data.asset?.name} has upstreams: ${result}`);
  return result;
});

const assetHasDownstreams = computed(() => {
  const result = isAsset.value && props.data.asset?.hasDownstreams;
  console.log(`Asset ${props.data.asset?.name} has downstreams: ${result}`);
  return result;
});

const handleStyle = computed(() => ({
  opacity: 0,
}));

const showUpstreamIcon = computed(() => isAsset.value && props.data?.hasUpstreamForClicking);
const showDownstreamIcon = computed(() => isAsset.value && props.data?.hasDownstreamForClicking);

const assetClass = computed(() => {
  let classes = "rounded w-56";
  if (props.status) {
    classes += ` ${selectedStatusStyle.value}`;
  }
  return classes;
});
const emit = defineEmits(["add-upstream", "add-downstream"]);
const onAddUpstream = () => {
  emit("add-upstream", props.data.asset?.name);
};
const onAddDownstream = () => {
  emit("add-downstream", props.data.asset?.name);
};
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
  background-color: rgba(17, 24, 39, 0.8);
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
