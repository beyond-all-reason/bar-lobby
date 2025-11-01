<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.navbar.settings.title')">
        <div class="gridform">
            <div>{{ t("lobby.navbar.settings.fullscreen") }}</div>
            <Checkbox v-model="settingsStore.fullscreen" />

            <div>{{ t("lobby.navbar.settings.windowSize") }}</div>
            <Select
                v-model="settingsStore.size"
                :options="sizeOptions"
                optionLabel="label"
                optionValue="value"
                :disabled="settingsStore.fullscreen"
            />

            <div>{{ t("lobby.navbar.settings.display") }}</div>
            <Select v-model="settingsStore.displayIndex" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>{{ t("lobby.navbar.settings.skipIntro") }}</div>
            <Checkbox v-model="settingsStore.skipIntro" />

            <template v-if="settingsStore.devMode">
                <div>{{ t("lobby.navbar.settings.loginAutomatically") }}</div>
                <Checkbox v-model="settingsStore.loginAutomatically" />
            </template>

            <div>{{ t("lobby.navbar.settings.sfxVolume") }}</div>
            <Range v-model="settingsStore.sfxVolume" :min="0" :max="100" :step="1" />

            <div>{{ t("lobby.navbar.settings.musicVolume") }}</div>
            <Range v-model="settingsStore.musicVolume" :min="0" :max="100" :step="1" />

            <div>{{ t("lobby.navbar.settings.devMode") }}</div>
            <Checkbox v-model="settingsStore.devMode" />

            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
            <Button @click="uploadLogsCommand">{{ t("lobby.navbar.settings.uploadLogs") }}</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import OverlayPanel from "primevue/overlaypanel";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import { infosStore } from "@renderer/store/infos.store";
import { uploadLogs } from "@renderer/utils/log";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const op = ref();
const tooltipMessage = ref("");

const sizeOptions = [
    { label: t("lobby.navbar.settings.labelLg"), value: 900 },
    { label: t("lobby.navbar.settings.labelMd"), value: 720 },
    { label: t("lobby.navbar.settings.labelSm"), value: 540 },
];

const displayOptions = asyncComputed(async () => {
    return Array(infosStore.hardware.numOfDisplays)
        .fill(0)
        .map((_, i) => {
            //return { label: `Display ${i + 1}`, value: i };
            return { label: t("lobby.navbar.settings.labelDisplay", { id: i + 1 }), value: i };
        });
});

async function uploadLogsCommand(event) {
    // Store off event and target to avoid async issue
    const curE = event;
    const curTarget = curE.currentTarget;

    // Do the operations
    try {
        const url = await uploadLogs();
        await navigator.clipboard.writeText(url);
        tooltipMessage.value = t("lobby.navbar.settings.logUrlCopied");
    } catch (e) {
        if (typeof e === "string") {
            tooltipMessage.value = e;
        } else {
            tooltipMessage.value = t("lobby.navbar.settings.couldNotUploadLog");
        }
    }

    // Display feedback
    op.value.show(curE, curTarget);
}
</script>

<style lang="scss" scoped>
.container {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}
</style>
