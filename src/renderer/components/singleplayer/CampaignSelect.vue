<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!--
The campaigns to pick from, with each root's tutorials as one more tile beside them. Official content and
everything else get their own pages, so this shows one or the other. Sources other than official are
grouped by source, so a new kind of source shows up here without changes.
-->
<template>
    <div class="flex-col gap-lg">
        <p v-if="singleplayerStore.loadError">{{ singleplayerStore.loadError }}</p>
        <p v-else-if="official && !infosStore.features.officialContent">{{ t("lobby.singleplayer.content.notInEdition") }}</p>
        <p v-else-if="singleplayerStore.content && groups.length === 0">{{ t("lobby.singleplayer.content.empty") }}</p>
        <div v-for="group in groups" :key="group.source" class="flex-col gap-md">
            <h2 v-if="!official">{{ group.source }}</h2>
            <div class="tiles">
                <ContentTile
                    v-for="root in group.tutorialRoots"
                    :key="`tutorials:${root.rootId}`"
                    :title="t('lobby.singleplayer.content.tutorials')"
                    :image-url="singleplayerLogic.tutorialsOf(root.source, root.rootId)[0]?.imageUrl"
                    :completed="singleplayerLogic.tutorialsCompleted(root.source, root.rootId)"
                    @select="router.push(`/play/tutorials/${root.source}/${root.rootId}`)"
                />
                <ContentTile
                    v-for="campaign in group.campaigns"
                    :key="`campaign:${campaign.rootId}:${campaign.id}`"
                    :title="text(campaign.config.titleKey, campaign.language)"
                    :description="text(campaign.config.descriptionKey, campaign.language)"
                    :image-url="campaign.logoUrl"
                    :completed="singleplayerLogic.campaignCompleted(campaign)"
                    @select="router.push(`/play/campaigns/${campaign.source}/${campaign.rootId}/${campaign.id}`)"
                />
            </div>
        </div>
        <ContentProblems v-if="settingsStore.devMode && singleplayerStore.content" :problems="singleplayerStore.content.problems" />
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import ContentProblems from "@renderer/components/singleplayer/ContentProblems.vue";
import ContentTile from "@renderer/components/singleplayer/ContentTile.vue";
import { useContentText } from "@renderer/composables/useContentText";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import { infosStore } from "@renderer/store/infos.store";
import { settingsStore } from "@renderer/store/settings.store";
import { singleplayerStore } from "@renderer/store/singleplayer.store";
import type { ContentSource, SingleplayerCampaign } from "@shared/content/singleplayer";

const props = defineProps<{
    // Official content only, or everything else.
    official: boolean;
}>();

const { t } = useTypedI18n();
const text = useContentText();
const router = useRouter();

type Group = { source: ContentSource; tutorialRoots: { source: ContentSource; rootId: string }[]; campaigns: SingleplayerCampaign[] };

const groups = computed(() => {
    const content = singleplayerStore.content;
    if (!content) {
        return [];
    }

    const groups = new Map<ContentSource, Group>();
    const groupFor = (source: ContentSource) => {
        let group = groups.get(source);
        if (!group) {
            group = { source, tutorialRoots: [], campaigns: [] };
            groups.set(source, group);
        }
        return group;
    };
    const wanted = (source: ContentSource) => (source === "official") === props.official;

    for (const tutorial of content.tutorials.filter((tutorial) => wanted(tutorial.source))) {
        const roots = groupFor(tutorial.source).tutorialRoots;
        if (!roots.some((root) => root.rootId === tutorial.rootId)) {
            roots.push({ source: tutorial.source, rootId: tutorial.rootId });
        }
    }
    for (const campaign of content.campaigns.filter((campaign) => wanted(campaign.source))) {
        groupFor(campaign.source).campaigns.push(campaign as SingleplayerCampaign);
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
