<template>
    <div class="container">
        <div v-if="filteredOptions != null" class="suggestions">
            <div v-for="(option, index) in filteredOptions" :key="index" @click="updateText(option)">
                {{ option }}
            </div>
        </div>
        <Textbox
            id="textInput"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            @keydown.up="changeSelection(1)"
            @keydown.down="changeSelection(-1)"
        />
    </div>
</template>
<script lang="ts" setup>
import type { Ref } from "vue";
import { ref, watch } from "vue";

import Textbox from "@/components/controls/Textbox.vue";

const props = defineProps<{
    modelValue: string;
    options: string[];
}>();
const emit = defineEmits(["update:modelValue"]);

const filteredOptions: Ref<string[] | null> = ref(null);
const selection = ref(0);

watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue == "") {
            filteredOptions.value = null;
        } else {
            // Assumes that the options list is all lowercase. This is the case for commands.
            const lower = newValue.toLowerCase();
            filteredOptions.value = props.options.filter((v) => v.startsWith(lower) && v !== lower);
        }
    }
);

function updateText(value: string) {
    emit("update:modelValue", value);

    // Refocus on the input so that users can click enter right after selecting an auto-suggestion.
    document.getElementsByTagName("input")["textInput"].focus();
}

function changeSelection(direction: 1 | -1) {
    if (filteredOptions.value == null) return;
    let tmpSelection = selection.value + direction;

    // bound checks
    if (tmpSelection >= filteredOptions.value.length) {
        tmpSelection = filteredOptions.value.length - 1;
    }
    if (tmpSelection < 0) {
        tmpSelection = 0;
    }
    selection.value = tmpSelection;
}
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
