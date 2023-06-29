<template>
    <div class="container">
        <div v-if="filteredOptions != null" class="optionsContainer">
            <div
                v-for="(option, index) in filteredOptions"
                :key="index"
                :class="{ selected: keyboardSelectionIndex === index }"
                @click="clickOption(option)"
            >
                <b class="suggestion">{{ option.suggestion }}</b>
                <p v-if="option.description != null" class="description">{{ option.description }}</p>
            </div>
        </div>
        <Textbox
            id="textInput"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            @keydown.up.prevent.stop="changeKeyboardSelection(-1)"
            @keydown.down.prevent.stop="changeKeyboardSelection(1)"
        />
    </div>
</template>
<script lang="ts" setup>
import type { Ref } from "vue";
import { onMounted, ref, watch } from "vue";

import Textbox from "@/components/controls/Textbox.vue";
import AutoSuggestionOption from "@/utils/auto-suggestion-option";

const props = defineProps<{
    modelValue: string;
    options: AutoSuggestionOption[];
}>();
const emit = defineEmits(["update:modelValue", "update-selection", "exact-match"]);

const originalOptions: Ref<AutoSuggestionOption[]> = ref(props.options);
const filteredOptions: Ref<AutoSuggestionOption[] | null> = ref(null);
const keyboardSelectionIndex: Ref<number | null> = ref(0);

onMounted(() => {
    updateOriginalOptions(props.options);
});

watch(
    () => props.modelValue,
    (newValue) => {
        updateKeyboardSelectionIndex(null);

        if (newValue == "") {
            filteredOptions.value = null;
            return;
        }

        const lower = newValue.toLowerCase();
        filteredOptions.value = originalOptions.value.filter(
            (option) => option.suggestion.startsWith(lower) && option.suggestion !== lower
        );

        originalOptions.value.forEach((option) => {
            if (option.suggestion === lower) {
                emit("update-selection", option.suggestion);
            }
        });
    }
);

watch(
    () => props.options,
    (newOptions) => {
        updateOriginalOptions(newOptions);
    }
);

function updateOriginalOptions(options: AutoSuggestionOption[]) {
    originalOptions.value = options.map((v) => {
        return {
            suggestion: v.suggestion.toLowerCase(),
            description: v.description,
            replaceSuggestion: v.replaceSuggestion,
        };
    });
}

function clickOption(option: AutoSuggestionOption) {
    const newValue = option.replaceSuggestion ?? option.suggestion;
    emit("update:modelValue", newValue);
    updateKeyboardSelectionIndex(null);

    // Refocus on the input so that users can key "enter" right after selecting an auto-suggestion.
    document.getElementsByTagName("input")["textInput"].focus();
}

function changeKeyboardSelection(direction: 1 | -1) {
    if (filteredOptions.value == null) {
        updateKeyboardSelectionIndex(null);
        return;
    }

    let tmpSelectionIndex = (keyboardSelectionIndex.value ?? -1) + direction;

    if (tmpSelectionIndex >= filteredOptions.value.length) {
        tmpSelectionIndex = filteredOptions.value.length - 1;
    }
    if (tmpSelectionIndex < 0) {
        tmpSelectionIndex = 0;
    }

    updateKeyboardSelectionIndex(tmpSelectionIndex);
}

function updateKeyboardSelectionIndex(newSelectionIndex: null | number) {
    keyboardSelectionIndex.value = newSelectionIndex;
    let newSelection: string | null = null;
    if (filteredOptions.value != null && keyboardSelectionIndex.value != null) {
        const autosuggestion = filteredOptions.value[keyboardSelectionIndex.value];
        newSelection = autosuggestion.replaceSuggestion ?? autosuggestion.suggestion;
    }
    emit("update-selection", newSelection);
}
</script>
<style lang="scss" scoped>
.optionsContainer {
    position: absolute;
    z-index: 99;
    bottom: 100%;
    left: 0;
    right: 0;
}
.optionsContainer div {
    padding: 10px;
    cursor: pointer;
    background-color: black;
    border-bottom: 1px solid #d4d4d4;
}
.optionsContainer div:hover,
.optionsContainer .selected {
    color: #000;
    background-color: #eee;
}
.container {
    position: relative;
    display: inline-block;
}
.suggestion {
    font-size: 15px;
}
.description {
    font-size: 12px;
}
</style>
