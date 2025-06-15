<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div>
        <Button @click="go">Go</Button>
    </div>
</template>

<script lang="ts" setup>
import Button from "@renderer/components/controls/Button.vue";
import Password from "@renderer/components/prompts/Password.vue";
import { usePrompt } from "@renderer/composables/usePrompt";

const { prompt } = usePrompt();

async function go() {
    const data = await prompt({
        component: Password,
        title: "Battle Password",
    });
    console.log(data);
}
</script>

<style lang="scss" scoped></style>
