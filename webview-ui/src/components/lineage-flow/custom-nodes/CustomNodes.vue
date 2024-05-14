<script lang="ts" setup>
import {computed, defineProps, ref} from 'vue'
import {Handle, Position} from '@vue-flow/core'
import {PlusIcon} from "@heroicons/vue/20/solid";
import type {BruinNodeProps} from "@/types";

const props = defineProps<BruinNodeProps>()

const defaultStyle = {
    main: "bg-gray-300 text-gray-800",
    label: "bg-gray-500 text-white",
}

const styles = {
    "bq.sql": {
        main: "bg-sky-300 text-sky-800",
        label: "bg-sky-500 text-sky-100",
    },
    "sf.sql": {
        main: "bg-orange-300 text-orange-800",
        label: "bg-orange-500 text-white",
    },
    'pg.sql': {
        main: 'bg-cyan-300 text-cyan-800',
        label: "bg-cyan-500 text-white",
    },
    'rs.sql': {
        main: 'bg-fuchsia-300 text-fuchsia-800',
        label: "bg-fuchsia-500 text-fuchsia-100",
    },
    'ms.sql': {
        main: 'bg-violet-300 text-violet-800',
        label: "bg-violet-500 text-violet-100",
    },
    'synapse.sql': {
        main: 'bg-purple-300 text-purple-800',
        label: "bg-purple-500 text-purple-100",
    },
    'ingestr': {
        main: 'bg-amber-300 text-amber-800',
        label: "bg-amber-500 text-amber-100",
    },
    "python": {
        main: "bg-green-300 text-green-800",
        label: "bg-green-500 text-white",
    },
    "python.beta": {
        main: "bg-green-300 text-green-800",
        label: "bg-green-500 text-white",
    }
}

const statusStyles = {
    "running": "ring-1 ring-yellow-400 bg-yellow-100 text-yellow-600 rounded-t",
    "success": "ring-1 ring-green-700 bg-green-600 text-white rounded-t",
    "failed": "ring-1 ring-red-700 bg-red-600 text-white rounded-t",
    "unknown": "ring-1 ring-gray-700 bg-gray-600 text-white rounded-t",
    "upstream_failed": "ring-1 ring-gray-700 bg-gray-600 text-white rounded-t",
}
const selectedStyle = computed(() => {
    if (props.data?.type === 'project') {
        console.log('Project', props.data?.type)
        return defaultStyle;
    }

    return styles[props.data?.asset?.type!!] || defaultStyle;
});

const selectedStatusStyle = computed(() => {
    return statusStyles[props.status || "unknown"];
});


const isFocusAsset = computed(() => { 
    console.log('isFocusAsset', props.data.label,  props.data.asset?.name, props.isFocusAsset)
    return props.isFocusAsset;
});

</script>

<template>
    <div class="flex items-end" >
        <div @click.stop="props.onNodeDoubleClick?.(nodeProps)"
             class="mr-1 border border-gray-700/30 hover:border-gray-700/50 rounded h-full py-2"
             :class="props.data.hasUpstreamForClicking ? '' : 'invisible'"
             title="Show Upstreams"
             v-if="data.asset && !data.asset.hasUpstreams">
            <PlusIcon
                class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700"/>
        </div>
        <div class="rounded w-56" :class="status ? selectedStatusStyle : ''">
            <div v-if="data.type === 'asset'"
                 class=""
                 :class="[isFocusAsset ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 w-56 rounded' : '',
             data.highlight ? '' : 'opacity-50']"
            >
                <div class="flex justify-between w-56" :class="status ? selectedStatusStyle : ''">
                    <div class="flex items-center px-2 font-mono text-sm font-semibold space-x-1">
                        <div v-if="status === 'running'"
                             class="flex-none rounded-full p-0.5 animate-pulse bg-yellow-400">
                            <div class="h-1 w-1 rounded-full bg-yellow-500"/>
                        </div>
                        <div>
                            <p class="">{{ status }}</p>
                        </div>
                    </div>
                    <div class="text-center rounded-t px-2 font-mono text-sm truncate border-t border-white/20"
                         :class="selectedStyle.label">
                        {{ data.asset?.type }}
                    </div>
                </div>

                <div
                    class="rounded-b font-mono py-1 text-left w-56 px-1 border border-white/20"
                    :class="[selectedStyle.main, status ? '' : 'rounded-tl']">
                    <div class="truncate">
                        {{ label }}
                    </div>
                </div>
            </div>

            <div v-else-if="data.type === 'dot'"
                 class="rounded border border-dashed border-gray-400 bg-gray-300 opacity-25 h-full w-full text-sm p-2 font-mono">
                {{ label }}
            </div>
            <div v-else
                 class="rounded border border-dashed border-gray-400 bg-gray-300 opacity-25 h-full w-full text-sm p-2 font-mono">
                Project: {{ data?.project?.name }}
            </div>
        </div>
        <div @click.stop="props.onNodeDoubleClick?.(nodeProps)"
             class="ml-1 border border-gray-700/20 hover:border-gray-700/50 rounded h-full py-2"
             title="Show Downstreams"
             v-if="data.asset && !data.asset.hasDownstreams && props.data.hasDownstreamForClicking">
            <PlusIcon
                class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700"/>
        </div>
    </div>
    <Handle v-if="data.type ==='asset' && data.asset?.hasDownstreams" class="w-0" type="source"
            :position="Position.Right"/>
    <Handle v-if="data.type === 'asset' && data.asset?.hasUpstreams" class="w-0" type="target"
            :position="Position.Left"/>

</template>
