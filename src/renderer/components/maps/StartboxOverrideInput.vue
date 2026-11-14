<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-sm">
        <div class="flex-row gap-sm">
            <Textbox v-model="input" :label="t('lobby.components.battle.mapOptionsModal.startboxOverride')" class="fullwidth" />
            <Button :disabled="!input.trim()" @click="apply">{{
                t("lobby.components.battle.mapOptionsModal.applyStartboxOverride")
            }}</Button>
        </div>
        <p v-if="unreadable" class="unreadable">{{ t("lobby.components.battle.mapOptionsModal.unreadableStartboxOverride") }}</p>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { decodeModoptionValue, isArrangement, parseStartboxOverrideInput, StartboxArrangement } from "@shared/startbox-modoptions";

const { t } = useTypedI18n();

const emit = defineEmits<{
    (event: "apply", override: StartboxArrangement): void;
}>();

const input = ref("");
const unreadable = ref(false);

async function apply() {
    const value = parseStartboxOverrideInput(input.value);
    const override = value ? await decodeModoptionValue(value) : undefined;
    if (!isArrangement(override) || override.startboxes.length === 0) {
        unreadable.value = true;

        return;
    }

    unreadable.value = false;
    input.value = "";
    emit("apply", override);
}
</script>

<style lang="scss" scoped>
.unreadable {
    color: rgb(239, 83, 80);
}
</style>
