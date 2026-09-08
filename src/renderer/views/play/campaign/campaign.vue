<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Campaign", order: 2, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="margin-lg">
            <h1>{{ t("lobby.singleplayer.campaigns.title") }}</h1>
            <div v-if="campaigns.length === 0" class="no-campaigns">
                <p>{{ t("lobby.singleplayer.campaigns.noCampaigns") }}</p>
            </div>
            <div v-else class="campaign-list">
                <div
                    v-for="campaign in campaigns"
                    :key="campaign.campaignId"
                    class="campaign-card content-card"
                    :class="{ locked: !campaign.unlocked }"
                    @click="campaign.unlocked && router.push(`/play/campaign/${campaign.campaignId}`)"
                >
                    <Panel :no-padding="true">
                        <div
                            class="background_image"
                            :style="{
                                'background-image': campaign.backgroundImage
                                    ? `url('bar://${encodeURIComponent(campaign.backgroundImage)}')`
                                    : undefined,
                            }"
                        >
                            <div class="flex-row padding-md">
                                <div class="flex-start flex-grow">
                                    <h2>
                                        <span>
                                            <img v-if="campaign.logo" :src="`bar://${encodeURIComponent(campaign.logo)}`" />
                                            {{ campaign.title }}
                                        </span>
                                    </h2>
                                    <p>{{ campaign.description }}</p>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { watch } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import { gameStore } from "@renderer/store/game.store";
import { useCampaignLoader } from "@renderer/composables/useCampaignLoader";
import { campaignCache } from "@renderer/store/campaign-cache";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

const router = useRouter();

const { campaigns, ensureLoaded } = useCampaignLoader();
await ensureLoaded();

watch(
    () => gameStore.selectedGameVersion?.gameVersion,
    async () => {
        campaignCache.value = [];
        await ensureLoaded();
    }
);
</script>

<style lang="scss" scoped>
.campaign-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
}

.no-campaigns {
    opacity: 0.6;
    font-size: 14px;
    padding: 20px 0;
}
</style>
