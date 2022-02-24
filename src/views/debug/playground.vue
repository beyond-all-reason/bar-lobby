<route lang="json">{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <div>Playground</div>
        <Tooltip content="hello world">
            <button @click="swap">Swap</button>
        </Tooltip>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Tooltip from "@/components/common/Tooltip.vue";

const toggle = ref(true);
const name = ref("fade");
const swap = () => {
    name.value = name.value === "fade" ? "slide" : "fade";
    toggle.value = !toggle.value;
};
const afterLeave = () => {
    console.log("afterLeave");
};
</script>