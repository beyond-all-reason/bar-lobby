<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div v-if="loading" class="flex-col flex-center gap-md loading">
        <Loader :absolutePosition="false" />
        <span>{{ t("lobby.navbar.settings.engine.loading") }}</span>
    </div>
    <div v-else class="flex-col gap-md">
        <small v-if="failure" class="error">{{ t(engineSettingsLogic.failureKey(failure)) }}</small>
        <template v-for="run of groupRuns(basic)" :key="run.group">
            <div v-if="run.group" class="group-header">{{ t(`lobby.navbar.settings.engine.groups.${run.group}`) }}</div>
            <div class="gridform">
                <EngineSettingControl
                    v-for="descriptor of run.descriptors"
                    :key="descriptor.key"
                    :descriptor="descriptor"
                    :disabled="disabled"
                />
            </div>
        </template>
        <template v-if="advanced || dev">
            <SearchBox v-model="query" :placeholder="t('lobby.navbar.settings.engine.search')" />
            <!-- Each tab written out: PrimeVue finds tabs only one level into the slot, so a v-for's are lost. -->
            <Accordion v-model:activeIndex="openSections" multiple lazy>
                <AccordionTab v-if="advanced" :header="`${t('lobby.navbar.settings.engine.advanced')} (${advanced.length})`">
                    <div class="flex-col gap-md">
                        <template v-for="run of groupRuns(advanced)" :key="run.group">
                            <div v-if="run.group" class="group-header">{{ t(`lobby.navbar.settings.engine.groups.${run.group}`) }}</div>
                            <div class="gridform">
                                <EngineSettingControl
                                    v-for="descriptor of run.descriptors"
                                    :key="descriptor.key"
                                    :descriptor="descriptor"
                                    :disabled="disabled"
                                />
                            </div>
                        </template>
                    </div>
                </AccordionTab>
                <AccordionTab v-if="dev" :header="`${t('lobby.navbar.settings.engine.dev')} (${dev.length})`">
                    <div class="gridform">
                        <EngineSettingControl
                            v-for="descriptor of dev"
                            :key="descriptor.key"
                            :descriptor="descriptor"
                            :disabled="disabled"
                        />
                    </div>
                </AccordionTab>
            </Accordion>
            <small v-if="query.trim() && !advanced?.length && !dev?.length">{{ t("lobby.navbar.settings.engine.noMatches") }}</small>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import AccordionTab from "primevue/accordiontab";
import Accordion from "@renderer/components/common/Accordion.vue";
import Loader from "@renderer/components/common/Loader.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import EngineSettingControl from "@renderer/components/settings/EngineSettingControl.vue";
import { useTypedI18n } from "@renderer/i18n";
import { engineSettingsLogic } from "@renderer/logic/engine-settings";
import { type EngineSettingCategory, type EngineSettingText, groupRuns } from "@renderer/logic/engine-settings/descriptors";
import { engineSettingsStore } from "@renderer/store/engine-settings.store";
import { settingsStore } from "@renderer/store/settings.store";

const { t } = useTypedI18n();

const unusable = computed(() => engineSettingsStore.view?.status.usable === false);
const disabled = computed(() => engineSettingsStore.view === undefined || unusable.value);
// Main reads every installed engine's settings at startup, which can take a while the first time.
const loading = computed(() => engineSettingsStore.view === undefined && engineSettingsStore.loadError === undefined);
const failure = computed(() => engineSettingsStore.loadError ?? (unusable.value ? "settings_unusable" : undefined));

const show = (text: EngineSettingText) => ("key" in text ? t(text.key) : text.text);

const query = ref("");
const basic = computed(() => engineSettingsLogic.descriptors("basic"));

// A section's settings matching the search, or undefined when it has none to offer at all and isn't shown.
function section(category: EngineSettingCategory) {
    return engineSettingsLogic.descriptors(category).length > 0 ? engineSettingsLogic.descriptors(category, query.value, show) : undefined;
}

const advanced = computed(() => section("advanced"));
const dev = computed(() => (settingsStore.devMode ? section("dev") : undefined));

// Collapsed to start with; a search opens every section so its matches show.
const openSections = ref<number[]>([]);
watch(query, (searched) => {
    if (searched.trim()) {
        openSections.value = [advanced.value, dev.value].filter(Boolean).map((_, index) => index);
    }
});

onMounted(() => engineSettingsLogic.load());
</script>

<style lang="scss" scoped>
.group-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 4px;
}

.loading {
    padding: 40px 0;
    opacity: 0.8;
}

.error {
    color: #ff6b6b;
    font-size: 11px;
}
</style>
