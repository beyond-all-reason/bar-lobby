<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Prompt>
        <Textbox v-model="password" :label="t('lobby.components.prompts.password')" type="password" />
    </Prompt>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import Textbox from "@renderer/components/controls/Textbox.vue";
import Prompt from "@renderer/components/prompts/Prompt.vue";

const { t } = useTypedI18n();

const password = ref("");

defineExpose({
    returnValue: () => ({
        password: password.value,
    }),
});
</script>

<style lang="scss" scoped></style>
