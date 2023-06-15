<template>
    <div class="container">
        <div class="suggestions">
            <div>hello</div>
            <div>There</div>
            <div>everyone</div>
            <div>{{ props.modelValue }}</div>
        </div>
        <Textbox :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
    </div>
</template>
<script lang="ts" setup>
import { watch } from "vue";

import Textbox from "@/components/controls/Textbox.vue";
const props = defineProps<{
    modelValue: string;
}>();
const emit = defineEmits(["update:modelValue"]);
watch(
    () => props.modelValue,
    (newValue) => {
        console.log(newValue);
    }
);
</script>
<style lang="scss" scoped>
.suggestions {
    position: absolute;
    z-index: 99;
    bottom: 100%;
    left: 0;
    right: 0;
}
.suggestions div {
    padding: 10px;
    cursor: pointer;
    background-color: black;
    border-bottom: 1px solid #d4d4d4;
    &:hover {
        color: #000;
        background-color: #eee;
    }
}
.container {
    position: relative;
    display: inline-block;
}
</style>
