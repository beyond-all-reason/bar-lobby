<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{
    path: "/play/campaign/:campaignId/:missionId",
    props: true,
    meta: { title: "Mission Details", hide: true, transition: { name: "slide-left" } },
}
</route>

<template>
    <div class="view margin-lg">
        <div class="gridform">
            <div class="flex-right">
                <Button v-tooltip.bottom="'Back'" class="icon close flex-right" @click="goBack">
                    <Icon :icon="arrow_back" :height="40" />
                </Button>
            </div>
            <h1>{{ mission?.title }}</h1>
        </div>
        <p>
            <i>{{ campaign?.title }}</i>
        </p>
        <p>{{ mission?.description }}</p>
        <MapSimplePreview :map="map"></MapSimplePreview>
        <Select
            v-if="effectiveSettings.difficulties.length > 0"
            v-model="selectedDifficulty"
            label="Difficulty"
            :options="effectiveSettings.difficulties"
            optionLabel="name"
        />
        <DownloadContentButton
            v-if="mission"
            :maps="mapName ? [mapName] : []"
            :games="gameVersion ? [gameVersion] : []"
            :engines="enginesStore.selectedEngineVersion ? [enginesStore.selectedEngineVersion.id] : []"
            class="fullwidth green"
            :disabled="gameStore.status !== GameStatus.CLOSED"
            @click="launch"
        >
            Launch
        </DownloadContentButton>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { GameStatus, gameStore } from "@renderer/store/game.store";
import { enginesStore } from "@renderer/store/engine.store";
import { useCampaignLoader } from "@renderer/composables/useCampaignLoader";
import { MissionDifficulty } from "@main/content/game/mission";
import { missionEffectiveSettings, missionHumanTeamNames, missionToScriptStr } from "@main/utils/mission-script-converter";
import { mapsStore } from "@renderer/store/maps.store";

const router = useRouter();

const props = defineProps<{
    missionId: string;
    campaignId: string;
}>();

const gameVersion = gameStore?.selectedGameVersion?.gameVersion;

const { ensureLoaded, getCampaign, getMission } = useCampaignLoader();
await ensureLoaded();

const campaign = computed(() => getCampaign(props.campaignId));
const mission = computed(() => getMission(props.campaignId, props.missionId));

const effectiveSettings = computed(() =>
    mission.value
        ? missionEffectiveSettings(campaign.value, mission.value)
        : { difficulties: [], defaultDifficulty: "", disableFactionPicker: false, disableInitialCommanderSpawn: false }
);

const selectedDifficulty = ref<MissionDifficulty | undefined>(
    effectiveSettings.value.difficulties.find((d) => d.name === effectiveSettings.value.defaultDifficulty)
);

// Handle underscores in map names
const mapName = computed(() => {
    const missionMapName = mission.value?.mapName ?? "";
    if (!missionMapName) return "";
    const normalize = (s: string) => s.toLowerCase().replaceAll(/[\s_]/g, "");
    const normalizedMission = normalize(missionMapName);
    return [...mapsStore.availableMapNames].find((n) => normalize(n) === normalizedMission) ?? missionMapName;
});

const map = useDexieLiveQueryWithDeps([mapName], async () => (mapName.value ? await db.maps.get(mapName.value) : undefined));

async function launch() {
    if (!mission.value || !enginesStore.selectedEngineVersion) return;
    // For single-player, the local player occupies the sole human slot.
    // TODO: for co-op, handle multiple names
    const localPlayerTeamName = missionHumanTeamNames(mission.value)[0] ?? "Player";
    // Use the resolved installed-map name (spaces↔underscores normalised)
    const resolvedMapName = mapName.value || undefined;
    const script = missionToScriptStr(
        mission.value,
        selectedDifficulty.value,
        effectiveSettings.value,
        localPlayerTeamName,
        gameVersion ?? "",
        resolvedMapName
    );
    await window.game.launchScript(script, gameVersion ?? "", enginesStore.selectedEngineVersion.id);
}

function goBack() {
    router.back();
}
</script>

<style></style>
