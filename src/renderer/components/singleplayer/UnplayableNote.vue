<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- Why an item can't be played on this install, shown on its dimmed tile or card. -->
<template>
    <p class="unplayable-note">{{ t(text.key, text.params) }}</p>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic, type UnplayableReason } from "@renderer/logic/singleplayer";

const { t } = useTypedI18n();

const props = defineProps<{
    reason: UnplayableReason;
}>();

const text = computed(() => singleplayerLogic.unplayableText(props.reason));
</script>

<style lang="scss" scoped>
.unplayable-note {
    font-weight: bold;
}
</style>
