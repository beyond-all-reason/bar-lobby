<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Campaign", hide: true, devOnly: true, transition: { name: "slide-left" } } }
</route>

<!--
One campaign's missions as cards, in the order the campaign lists them. Branches are not laid out as a
graph: content does not say which missions are alternatives to each other.
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
            <p v-if="singleplayerStore.savesLoadError">{{ singleplayerStore.savesLoadError }}</p>
            <p v-if="saveError">{{ saveError }}</p>
            <div v-if="campaign && state" class="scroll-container flex-col gap-md">
                <p>{{ text(campaign.config.descriptionKey, campaign.language) }}</p>
                <div v-if="compatibility !== 'compatible'" class="flex-row gap-md flex-center-items">
                    <span v-if="compatibility === 'older'">{{ t("lobby.singleplayer.content.saveFromOlderVersion") }}</span>
                    <span v-else>{{ t("lobby.singleplayer.content.saveFromNewerVersion") }}</span>
                    <Button v-if="compatibility === 'older'" class="red" @click="singleplayerLogic.deleteSave('campaign', campaign)">{{
                        t("lobby.singleplayer.content.startOver")
                    }}</Button>
                </div>
                <div class="flex-row gap-md">
                    <Button @click="router.push(`/play/campaigns/${source}/${rootId}/${id}/credits`)">{{
                        t("lobby.singleplayer.content.showCredits")
                    }}</Button>
                    <Button v-if="settingsStore.devMode" @click="singleplayerLogic.deleteSave('campaign', campaign)">
                        {{ t("lobby.singleplayer.content.deleteSave") }}
                    </Button>
                    <span v-if="state.finished">{{ t("lobby.singleplayer.content.completed") }}</span>
                </div>
                <div v-if="settingsStore.devMode && Object.keys(variables).length > 0">
                    <h4>{{ t("lobby.singleplayer.content.variables") }}</h4>
                    <div v-for="(value, key) in variables" :key="key">{{ key }}: {{ JSON.stringify(value) }}</div>
                </div>
                <div class="cards">
                    <MissionCard
                        v-for="mission in campaign.missions"
                        :key="mission.id"
                        :title="text(mission.manifest.titleKey, mission.language, campaign.language)"
                        :description="text(mission.manifest.descriptionKey, mission.language, campaign.language)"
                        :image-url="mission.imageUrl"
                        :background-image-url="mission.backgroundImageUrl"
                        :status="missionStatus(campaign.config, state, mission.id)"
                        @pass="singleplayerLogic.recordCampaignResult(campaign, mission.id, 'victory')"
                        @fail="singleplayerLogic.recordCampaignResult(campaign, mission.id, 'failure')"
                    />
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import MissionCard from "@renderer/components/singleplayer/MissionCard.vue";
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
const compatibility = computed(() => (campaign.value ? singleplayerLogic.campaignSaveCompatibility(campaign.value) : "compatible"));
const variables = computed(() => (campaign.value ? singleplayerLogic.variablesOf(campaign.value) : {}));
const saveError = computed(() => campaign.value && singleplayerLogic.saveErrorOf("campaign", campaign.value));

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

.cards {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
</style>
