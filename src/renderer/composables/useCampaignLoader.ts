// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { campaignCache } from "@renderer/store/campaign-cache";
import { gameStore } from "@renderer/store/game.store";
import { CampaignModel } from "@main/content/game/campaign-model";
import { MissionModel } from "@main/content/game/mission";

async function loadCampaigns(gameVersion: string | undefined) {
    campaignCache.value = gameVersion ? await window.game.getCampaigns(gameVersion) : [];
}

/**
 * Provides reactive access to the campaign list and convenience lookups.
 *
 * Call `await ensureLoaded()` at the top of `<script setup>` to guarantee
 * the cache is populated before the component renders. Child views (campaign
 * detail, mission detail) use `ensureLoaded()` as a guard for direct
 * navigation. To force a reload (e.g. when the game version changes), clear
 * the cache with `campaignCache.value = []` and then call `ensureLoaded()`.
 */
export function useCampaignLoader() {
    /** Ensures campaigns are loaded, fetching via IPC if the cache is empty. */
    async function ensureLoaded() {
        if (campaignCache.value.length === 0) {
            await loadCampaigns(gameStore?.selectedGameVersion?.gameVersion);
        }
    }

    function getCampaign(id: string): CampaignModel | undefined {
        return campaignCache.value.find((c) => c.campaignId === id);
    }

    function getMission(campaignId: string, missionId: string): MissionModel | undefined {
        return getCampaign(campaignId)?.missions[missionId];
    }

    return {
        campaigns: campaignCache,
        ensureLoaded,
        getCampaign,
        getMission,
    };
}
