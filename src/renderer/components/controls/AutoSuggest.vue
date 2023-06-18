<template>
    <div class="container">
        <div v-if="filteredOptions != null" class="suggestions">
            <div
                v-for="(option, index) in filteredOptions"
                :key="index"
                :class="{ selected: keyboardSelectionIndex === index }"
                @click="clickOption(option)"
            >
                {{ option }}
            </div>
        </div>
        <Textbox
            id="textInput"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            @keyup.up.stop="changeKeyboardSelection(-1)"
            @keyup.down.stop="changeKeyboardSelection(1)"
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
const emit = defineEmits(["update:modelValue", "update-selection"]);

const filteredOptions: Ref<string[] | null> = ref(null);
const keyboardSelectionIndex: Ref<number | null> = ref(0);

watch(
    () => props.modelValue,
    (newValue) => {
        // If the user continued entering text or already accepted an autosuggestion: reset selection to null.
        updateKeyboardSelectionIndex(null);

        // Don't show any options if the user hasn't entered anything.
        if (newValue == "") {
            filteredOptions.value = null;
        } else {
            // Assumes that the options list is all lowercase. This is the case for commands.
            const lower = newValue.toLowerCase();
            filteredOptions.value = props.options.filter((v) => v.startsWith(lower) && v !== lower);
        }
    }
);

function clickOption(option: string) {
    emit("update:modelValue", option);
    updateKeyboardSelectionIndex(null);

    // Refocus on the input so that users can key "enter" right after selecting an auto-suggestion.
    document.getElementsByTagName("input")["textInput"].focus();
}

// Logic for when a user keys up or down on the autosuggestion.
function changeKeyboardSelection(direction: 1 | -1) {
    if (filteredOptions.value == null) {
        updateKeyboardSelectionIndex(null);
        return;
    }

    let tmpSelectionIndex = (keyboardSelectionIndex.value ?? -1) + direction;

    // bound checks
    if (tmpSelectionIndex >= filteredOptions.value.length) {
        tmpSelectionIndex = filteredOptions.value.length - 1;
    }
    if (tmpSelectionIndex < 0) {
        tmpSelectionIndex = 0;
    }
    updateKeyboardSelectionIndex(tmpSelectionIndex);
}

// Both updates the keyboardSelectionIndex and computes the current selection to emit to the parent.
function updateKeyboardSelectionIndex(newSelectionIndex: null | number) {
    keyboardSelectionIndex.value = newSelectionIndex;
    const newSelection =
        filteredOptions.value == null || keyboardSelectionIndex.value == null ? null : filteredOptions.value[keyboardSelectionIndex.value];
    emit("update-selection", newSelection);
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
}

.suggestions div:hover,
.suggestions .selected {
    color: #000;
    background-color: #eee;
}

.container {
    position: relative;
    display: inline-block;
}
</style>
