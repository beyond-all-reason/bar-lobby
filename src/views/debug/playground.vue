<route lang="json">{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <div>Playground</div>
        <button @click="swap">Swap</button>
        <transition :name="name" mode="out-in" @after-leave="afterLeave">
            <div v-if="toggle">A</div>
            <div v-else>B</div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

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