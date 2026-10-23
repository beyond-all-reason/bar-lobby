<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Campaign", hide: true, devOnly: true, transition: { name: "slide-left" } } }
</route>

<!--
One campaign's missions in a single column, in the order the campaign lists them. Branches are not drawn
side by side: content does not say which missions are alternatives to each other.
-->
<template>
    <div class="flex-col fullheight">
        <div class="view-title flex-row gap-md flex-center-items">
            <Button @click="router.push(campaign?.source === 'official' ? '/play/campaign' : '/play/customCampaigns')">
                {{ t("lobby.singleplayer.content.back") }}
            </Button>
            <img v-if="campaign?.logoUrl" :src="campaign.logoUrl" class="logo" alt="" />
            <h1>{{ campaign ? text(campaign.config.titleKey, campaign.language) : id }}</h1>
        </div>
        <Panel class="flex-grow">
            <p v-if="singleplayerStore.loadError">{{ singleplayerStore.loadError }}</p>
            <p v-else-if="singleplayerStore.content && !campaign">{{ t("lobby.singleplayer.content.notFound") }}</p>
            <div v-if="campaign && state" class="scroll-container flex-col gap-md">
                <p>{{ text(campaign.config.descriptionKey, campaign.language) }}</p>
                <div class="flex-row gap-md">
                    <Button @click="router.push(`/play/campaigns/${source}/${rootId}/${id}/credits`)">{{
                        t("lobby.singleplayer.content.showCredits")
                    }}</Button>
                    <Button v-if="settingsStore.devMode" @click="singleplayerLogic.resetProgress('campaign', campaign)">
                        {{ t("lobby.singleplayer.content.resetProgress") }}
                    </Button>
                    <span v-if="state.finished">{{ t("lobby.singleplayer.content.completed") }}</span>
                </div>
                <MissionRow
                    v-for="mission in campaign.missions"
                    :key="mission.id"
                    :title="text(mission.manifest.titleKey, mission.language, campaign.language)"
                    :description="text(mission.manifest.descriptionKey, mission.language, campaign.language)"
                    :image-url="mission.imageUrl"
                    :status="missionStatus(campaign.config, state, mission.id)"
                    @pass="singleplayerLogic.recordCampaignResult(campaign, mission.id, 'victory')"
                    @fail="singleplayerLogic.recordCampaignResult(campaign, mission.id, 'failure')"
                />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import MissionRow from "@renderer/components/singleplayer/MissionRow.vue";
import { useContentText } from "@renderer/composables/useContentText";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import { settingsStore } from "@renderer/store/settings.store";
import { singleplayerStore } from "@renderer/store/singleplayer.store";
import { missionStatus } from "@shared/content/campaign-progress";
import { type ContentSource, isSameItem, type SingleplayerCampaign } from "@shared/content/singleplayer";

const { source, rootId, id } = defineProps<{
    source: string;
    rootId: string;
    id: string;
}>();

const { t } = useTypedI18n();
const text = useContentText();
const router = useRouter();

const campaign = computed(
    () =>
        singleplayerStore.content?.campaigns.find((campaign) => isSameItem(campaign, { source: source as ContentSource, rootId, id })) as
            | SingleplayerCampaign
            | undefined
);
const state = computed(() => campaign.value && singleplayerLogic.campaignState(campaign.value));

onMounted(() => {
    if (!singleplayerStore.content) {
        singleplayerLogic.loadContent();
    }
});
</script>

<style lang="scss" scoped>
.logo {
    max-height: 48px;
}
</style>
