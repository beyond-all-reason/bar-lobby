<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-md">
        <small v-if="failure" class="error">{{ t(engineSettingsLogic.failureKey(failure)) }}</small>
        <div class="gridform">
            <EngineSettingControl
                v-for="descriptor of CURATED_ENGINE_SETTING_DESCRIPTORS"
                :key="descriptor.key"
                :descriptor="descriptor"
                :disabled="unusable"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import EngineSettingControl from "@renderer/components/settings/EngineSettingControl.vue";
import { useTypedI18n } from "@renderer/i18n";
import { engineSettingsLogic } from "@renderer/logic/engine-settings";
import { CURATED_ENGINE_SETTING_DESCRIPTORS } from "@renderer/logic/engine-settings/descriptors";
import { engineSettingsStore } from "@renderer/store/engine-settings.store";

const { t } = useTypedI18n();

const unusable = computed(() => engineSettingsStore.view?.status.usable === false);
const failure = computed(() => engineSettingsStore.loadError ?? (unusable.value ? "settings_unusable" : undefined));

onMounted(() => engineSettingsLogic.load());
</script>

<style lang="scss" scoped>
.error {
    color: #ff6b6b;
    font-size: 11px;
}
</style>
