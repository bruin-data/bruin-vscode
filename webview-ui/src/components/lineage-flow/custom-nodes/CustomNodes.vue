<template>
  <div class="flex items-end">
    <div
      @click.stop="onAddUpstream"
      class="mr-1 border border-gray-700/30 hover:border-gray-700/50 rounded h-full py-2"
      :class="props.data.hasUpstreamForClicking ? '' : 'invisible'"
      title="Show Upstreams"
      v-if="showUpstreamIcon"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>
    <!-- Invisible Fallback for Upstream -->
    <!-- <div
      v-else
      class="mr-1 border border-gray-700/30 rounded h-full py-2 flex items-center justify-center opacity-0"
      :style="{ width: '24px', height: '24px' }"
    >
     
    </div> -->
    <div :class="assetClass">
      <div
        v-if="data.type === 'asset'"
        :class="[
          props.data.asset?.isFocusAsset
            ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 w-56 rounded'
            : '',
          data.highlight ? '' : '',
        ]"
      >
        <div class="flex justify-between w-56" :class="status ? selectedStatusStyle : ''">
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
          class="rounded-b font-mono py-1 text-left w-56 px-1 border border-white/20"
          :class="[selectedStyle.main, status ? '' : 'rounded-tl']"
        >
          <div class="truncate">
            {{ label }}
          </div>
        </div>
      </div>
    </div>
    <div
      @click.stop="onAddDownstream"
      class="ml-1 border border-gray-700/20 hover:border-gray-700/50 rounded h-full py-2"
      title="Show Downstreams"
      v-if="showDownstreamIcon"
    >
      <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
    </div>
  </div>
  <Handle v-if="assetHasDownstreams" class="opacity-0" type="source" :position="Position.Right" />
  <Handle v-if="assetHasUpstreams" class="opacity-0" type="target" :position="Position.Left" />
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
const assetHasUpstreams = computed(() => isAsset.value && props.data.asset?.hasUpstreams);
const assetHasDownstreams = computed(() => isAsset.value && props.data.asset?.hasDownstreams);
console.log("hasUpstream, ... ", assetHasUpstreams.value);
console.log("hasDownstream, ... ", assetHasDownstreams.value);

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
