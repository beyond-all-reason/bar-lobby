<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <form ref="form" @submit.prevent="submit" @keydown.enter="submit">
        <div class="flex-col gap-md">
            <slot />
            <div class="flex-row gap-md flex-space-between">
                <Button class="flex-grow red" @click="cancel">Cancel</Button>
                <Button class="flex-grow green" type="submit">OK</Button>
            </div>
        </div>
    </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import { usePrompt } from "@renderer/composables/usePrompt";

const form = ref<HTMLFormElement>();
const { promptRef } = usePrompt();

function cancel() {
    promptRef.value?.close();
}

function submit() {
    promptRef.value?.submit();
}
</script>

<style lang="scss" scoped></style>
