<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Tutorials", hide: true, devOnly: true, transition: { name: "slide-left" } } }
</route>

<!-- One root's tutorials, shown together like a campaign. Every tutorial can be played at any time. -->
<template>
    <div class="flex-col fullheight">
        <div class="view-title flex-row gap-md flex-center-items">
            <Button @click="router.push(source === 'official' ? '/play/campaign' : '/play/customCampaigns')">{{
                t("lobby.singleplayer.content.back")
            }}</Button>
            <h1>{{ t("lobby.singleplayer.content.tutorials") }}</h1>
        </div>
        <Panel class="flex-grow">
            <p v-if="singleplayerStore.loadError">{{ singleplayerStore.loadError }}</p>
            <p v-else-if="singleplayerStore.content && tutorials.length === 0">{{ t("lobby.singleplayer.content.notFound") }}</p>
            <p v-if="singleplayerStore.saveError">{{ singleplayerStore.saveError }}</p>
            <div class="scroll-container flex-col gap-md">
                <div v-if="settingsStore.devMode" class="flex-row gap-md">
                    <Button @click="singleplayerLogic.deleteTutorialSaves(source as ContentSource, rootId)">{{
                        t("lobby.singleplayer.content.deleteSave")
                    }}</Button>
                </div>
                <div class="cards">
                    <MissionCard
                        v-for="tutorial in tutorials"
                        :key="tutorial.id"
                        :title="text(tutorial.manifest.titleKey, tutorial.language)"
                        :description="text(tutorial.manifest.descriptionKey, tutorial.language)"
                        :image-url="tutorial.imageUrl"
                        :background-image-url="tutorial.backgroundImageUrl"
                        :status="itemStatus(singleplayerLogic.itemCompleted(tutorial))"
                        @pass="singleplayerLogic.recordItemResult(tutorial, 'victory')"
                        @fail="singleplayerLogic.recordItemResult(tutorial, 'failure')"
                    />
                </div>
                <ContentProblems v-if="settingsStore.devMode && singleplayerStore.content" :problems="singleplayerStore.content.problems" />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import ContentProblems from "@renderer/components/singleplayer/ContentProblems.vue";
import MissionCard from "@renderer/components/singleplayer/MissionCard.vue";
import { useContentText } from "@renderer/composables/useContentText";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import { settingsStore } from "@renderer/store/settings.store";
import { singleplayerStore } from "@renderer/store/singleplayer.store";
import { itemStatus } from "@shared/content/campaign-progress";
import type { ContentSource, SingleplayerScenario } from "@shared/content/singleplayer";

const { source, rootId } = defineProps<{
    source: string;
    rootId: string;
}>();

const { t } = useTypedI18n();
const text = useContentText();
const router = useRouter();

const tutorials = computed(() => singleplayerLogic.tutorialsOf(source as ContentSource, rootId) as SingleplayerScenario[]);

onMounted(() => {
    if (!singleplayerStore.content) {
        singleplayerLogic.loadContent();
    }
});
</script>

<style lang="scss" scoped>
.cards {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
</style>
