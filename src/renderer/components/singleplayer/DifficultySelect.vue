<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- Chooses the difficulty a campaign, scenario or tutorial is played at, from the ones it offers. -->
<template>
    <Select
        :modelValue="modelValue"
        :options="options"
        optionLabel="label"
        optionValue="id"
        :label="t('lobby.singleplayer.content.difficulty')"
        :disabled="disabled"
        @update:model-value="(difficulty: Difficulty) => emit('update:modelValue', difficulty)"
    />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Select from "@renderer/components/controls/Select.vue";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import type { Difficulty } from "@shared/content/schema/common";

const { t } = useTypedI18n();

const props = defineProps<{
    // Easiest first.
    offered: Difficulty[];
    modelValue: Difficulty;
    disabled?: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [difficulty: Difficulty];
}>();

const options = computed(() => props.offered.map((id) => ({ id, label: t(singleplayerLogic.difficultyName(id)) })));
</script>
