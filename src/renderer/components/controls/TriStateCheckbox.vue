<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Control class="checkbox">
        <div class="check-wrapper" @click="onClick">
            <Icon v-if="modelValue === 'true'" :icon="checkBold" height="22px" />
            <Icon v-else-if="modelValue === 'false'" :icon="closeThick" height="22px" />
        </div>
    </Control>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import closeThick from "@iconify-icons/mdi/close-thick";

import Control from "@renderer/components/controls/Control.vue";

// Note; due to the triple state of this checkbox, the value is a string of 3 possible choices.
// If you use this, you may have to convert the string 'false' to a false boolean and `null` to a null value!
const props = withDefaults(
    defineProps<{
        modelValue: "true" | "false" | "null";
    }>(),
    {
        modelValue: "null",
    }
);

const emit = defineEmits<{
    (event: "update:modelValue", checked: "true" | "false" | "null"): void;
}>();

function onClick() {
    emit("update:modelValue", props.modelValue === "true" ? "false" : props.modelValue === "false" ? "null" : "true");
}
</script>

<style lang="scss" scoped>
.checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row-reverse;
    :deep(.label) {
        border-right: none;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
}
.check-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 33px;
    max-width: 33px;
    max-width: 33px;
    min-width: 33px;
}
</style>
