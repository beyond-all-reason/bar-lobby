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
            <h1>{{ route.meta.title }}</h1>
            <div v-if="campaigns.length === 0" class="no-campaigns">
                <p>No campaigns available for the selected game version.</p>
            </div>
            <div v-else class="campaign-list">
                <div v-for="campaign in campaigns" :key="campaign.campaignId" class="campaign-card">
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
                                <div class="flex-end">
                                    <Button
                                        :disabled="!campaign.unlocked"
                                        @click="campaign.unlocked && router.push(`/play/campaign/${campaign.campaignId}`)"
                                        :class="campaign.unlocked ? 'green' : 'red'"
                                    >
                                        <h1>Open Campaign</h1>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
            <Panel v-if="settingsStore.devMode">
                <Button disabled>Mission Configurator</Button>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { settingsStore } from "@renderer/store/settings.store";
import { gameStore } from "@renderer/store/game.store";
import { CampaignModel } from "@main/content/game/campaign";
import { campaignCache } from "@renderer/store/campaign-cache";
import { Logger } from "@renderer/utils/log";

const log = new Logger("campaign.vue");
const router = useRouter();
const route = router.currentRoute.value;

const gameVersion = gameStore?.selectedGameVersion?.gameVersion;
log.info(`Campaign view mounted. Selected game version: "${gameVersion ?? "none"}"`);

log.info(`Calling getCampaigns via IPC for game version "${gameVersion ?? "none"}"`);
const loadedCampaigns = gameVersion ? await window.game.getCampaigns(gameVersion) : [];
log.info(`Received ${loadedCampaigns.length} campaign(s) from main process for version "${gameVersion ?? "none"}"`);
if (loadedCampaigns.length > 0) {
    log.info(
        `Campaigns received: [${loadedCampaigns
            .map((c) => `id="${c.campaignId}" title="${c.title}" missions=${c.missions.size} unlocked=${c.unlocked}`)
            .join("; ")}]`
    );
} else {
    log.info(`No campaigns returned — campaignCache will be set to an empty array`);
}

campaignCache.value = loadedCampaigns;
log.info(`campaignCache updated with ${loadedCampaigns.length} campaign(s)`);
const campaigns = ref<CampaignModel[]>(loadedCampaigns);
log.info(`campaigns ref initialised with ${campaigns.value.length} item(s)`);
log.info(`Current route path: "${router.currentRoute.value.path}", name: "${String(router.currentRoute.value.name)}"`);

watch(
    () => gameStore.selectedGameVersion?.gameVersion,
    async (newVersion) => {
        log.info(`Game version changed to "${newVersion ?? "none"}". Re-fetching campaigns.`);
        log.info(`Calling getCampaigns via IPC for updated game version "${newVersion ?? "none"}"`);
        campaigns.value = newVersion ? await window.game.getCampaigns(newVersion) : [];
        log.info(`Received ${campaigns.value.length} campaign(s) for updated version "${newVersion ?? "none"}"`);
        if (campaigns.value.length > 0) {
            log.info(
                `Updated campaigns: [${campaigns.value
                    .map((c) => `id="${c.campaignId}" title="${c.title}" missions=${c.missions.size} unlocked=${c.unlocked}`)
                    .join("; ")}]`
            );
        }
        campaignCache.value = campaigns.value;
        log.info(`campaignCache updated with ${campaigns.value.length} campaign(s) after version change`);
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

.background_image {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}

.no-campaigns {
    opacity: 0.6;
    font-size: 14px;
    padding: 20px 0;
}
</style>
