<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Content Scenarios", order: 1, devOnly: true, transition: { name: "slide-left" } } }
</route>

<!--
Scenarios from singleplayer content, beside the older scenarios.vue that reads them out of the game
archive. If the design team settles that scenarios ship as their own content, like campaigns, rather than
inside the game, scenarios.vue and the game-version scenario parsing behind it (window.game.getScenarios,
src/main/content/game/game-scenarios.ts) may be removed in favour of this view.
-->
<template>
    <div class="flex-col fullheight">
        <div class="view-title">
            <h1>{{ t("lobby.singleplayer.content.scenarios") }}</h1>
        </div>
        <Panel class="flex-grow">
            <div class="scroll-container flex-col gap-lg">
                <p v-if="singleplayerStore.loadError">{{ singleplayerStore.loadError }}</p>
                <p v-else-if="singleplayerStore.content && groups.length === 0">{{ t("lobby.singleplayer.content.empty") }}</p>
                <div v-for="group in groups" :key="group.source" class="flex-col gap-md">
                    <h2>{{ group.source }}</h2>
                    <div class="tiles">
                        <ContentTile
                            v-for="scenario in group.scenarios"
                            :key="`${scenario.rootId}:${scenario.id}`"
                            :title="text(scenario.manifest.titleKey, scenario.language)"
                            :image-url="scenario.imageUrl"
                            :completed="singleplayerLogic.itemCompleted(scenario)"
                            :selected="selected !== undefined && isSameItem(selected, scenario)"
                            @select="selected = scenario"
                        />
                    </div>
                </div>
                <MissionRow
                    v-if="selected"
                    :title="text(selected.manifest.titleKey, selected.language)"
                    :description="text(selected.manifest.descriptionKey, selected.language)"
                    :image-url="selected.imageUrl"
                    :status="itemStatus(singleplayerLogic.itemCompleted(selected))"
                    @pass="singleplayerLogic.recordItemResult(selected, 'victory')"
                    @fail="singleplayerLogic.recordItemResult(selected, 'failure')"
                />
                <ContentProblems v-if="settingsStore.devMode && singleplayerStore.content" :problems="singleplayerStore.content.problems" />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import ContentProblems from "@renderer/components/singleplayer/ContentProblems.vue";
import ContentTile from "@renderer/components/singleplayer/ContentTile.vue";
import MissionRow from "@renderer/components/singleplayer/MissionRow.vue";
import { useContentText } from "@renderer/composables/useContentText";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import { settingsStore } from "@renderer/store/settings.store";
import { singleplayerStore } from "@renderer/store/singleplayer.store";
import { itemStatus } from "@shared/content/campaign-progress";
import { type ContentSource, isSameItem, type SingleplayerScenario } from "@shared/content/singleplayer";

const { t } = useTypedI18n();
const text = useContentText();

const selected = ref<SingleplayerScenario>();

// Grouped by whatever sources arrive, so a new kind of source shows up without changes here.
const groups = computed(() => {
    const groups = new Map<ContentSource, { source: ContentSource; scenarios: SingleplayerScenario[] }>();
    for (const scenario of (singleplayerStore.content?.scenarios ?? []) as SingleplayerScenario[]) {
        const group = groups.get(scenario.source) ?? { source: scenario.source, scenarios: [] };
        group.scenarios.push(scenario);
        groups.set(scenario.source, group);
    }

    return [...groups.values()];
});

// Rescanned on every visit, so content added while the client runs shows up.
onMounted(() => singleplayerLogic.loadContent());
</script>

<style lang="scss" scoped>
.tiles {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
</style>
