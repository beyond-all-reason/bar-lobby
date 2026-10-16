<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Options
        :label="label"
        :modelValue="selected"
        :options="options"
        optionLabel="label"
        optionValue="value"
        :unselectable="false"
        @update:modelValue="onUpdate"
    >
        <template #option="{ option }">
            <span v-tooltip.bottom="option.tooltip" class="tri-option">{{ option.label }}</span>
        </template>
    </Options>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Options from "@renderer/components/controls/Options.vue";
import type { LobbyTriState } from "@shared/lobby-list-query";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    modelValue?: LobbyTriState;
    label: string;
    hideTooltip: string;
    onlyTooltip: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: boolean | undefined): void;
}>();

type Choice = "hide" | "any" | "only";

const options = computed(() => [
    { label: t("lobby.multiplayer.custom.menu.hide"), value: "hide", tooltip: props.hideTooltip },
    { label: t("lobby.multiplayer.custom.menu.any"), value: "any" },
    { label: t("lobby.multiplayer.custom.menu.only"), value: "only", tooltip: props.onlyTooltip },
]);

const selected = computed<Choice>(() => (props.modelValue === true ? "only" : props.modelValue === false ? "hide" : "any"));

function onUpdate(value: Choice) {
    emit("update:modelValue", value === "any" ? undefined : value === "only");
}
</script>

<style lang="scss" scoped>
:deep(.p-selectbutton .p-button) {
    padding: 0;
}
.tri-option {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 10px;
}
</style>
