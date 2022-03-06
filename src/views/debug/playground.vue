<route lang="json">{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <div>Playground</div>
        <ContextMenu :entries="[{ label: 'First item', action: test }, { label: 'Nope', action: test }]">
            <button @click="swap">
                Contex Menu
            </button>
        </ContextMenu>
        <Tooltip content="tooltip!">
            <button @click="swap">
                Tooltip
            </button>
        </Tooltip>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import ContextMenu from "@/components/common/ContextMenu.vue";
import Tooltip from "@/components/common/Tooltip.vue";

const toggle = ref(true);
const name = ref("fade");
const swap = () => {
    name.value = name.value === "fade" ? "slide" : "fade";
    toggle.value = !toggle.value;
};
const test = () => {
    console.log("test");
};
</script>