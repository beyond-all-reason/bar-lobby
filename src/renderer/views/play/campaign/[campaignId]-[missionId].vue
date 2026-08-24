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
        <div class="mission-details">
            <p>
                <i>{{ campaign?.title }}</i>
            </p>
            <p>{{ mission?.description }}</p>
            <p v-if="authors.length > 0" class="authors">By {{ authors.join(", ") }}</p>
            <MapSimplePreview class="map-preview" :map="map"></MapSimplePreview>
            <Panel v-if="briefing" class="briefing">
                <template #header><h3>Briefing</h3></template>
                <div class="briefing-content">
                    <section v-if="briefing.objectives?.length">
                        <h4>Objectives</h4>
                        <ul>
                            <li v-for="(objective, i) in briefing.objectives" :key="i">{{ objective }}</li>
                        </ul>
                    </section>
                    <section v-if="briefing.alliesPresent?.length">
                        <h4>Allies present</h4>
                        <ul>
                            <li v-for="(ally, i) in briefing.alliesPresent" :key="i">{{ ally }}</li>
                        </ul>
                    </section>
                    <section v-if="briefing.knownHostiles?.length">
                        <h4>Known hostiles</h4>
                        <ul>
                            <li v-for="(hostile, i) in briefing.knownHostiles" :key="i">{{ hostile }}</li>
                        </ul>
                    </section>
                    <section v-if="briefing.newUnits?.length">
                        <h4>New units</h4>
                        <ul>
                            <li v-for="unit in briefing.newUnits" :key="unit.unitDefName">
                                <b>{{ unit.unitDefName }}</b> — {{ unit.description }}
                            </li>
                        </ul>
                    </section>
                </div>
            </Panel>
        </div>
        <div class="mission-actions">
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
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import Panel from "@renderer/components/common/Panel.vue";
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

const briefing = computed(() => mission.value?.briefing);
// authors is campaign-level unless the mission credits its own.
const authors = computed(() => mission.value?.authors ?? campaign.value?.authors ?? []);

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
    const missionMapName = mission.value?.startScript.mapName ?? "";
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

<style lang="scss" scoped>
// The view is a flex column, so the scrollable details must be allowed to shrink
// while the difficulty selector and launch button keep their natural height.
.mission-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;

    // Both rules override a component default of the same specificity, so they stay nested to win.
    .map-preview {
        flex: 0 0 220px;
        height: 220px;
    }

    .briefing {
        flex: 0 0 auto;
        max-height: none;
    }
}

.mission-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 0 0 auto;
}

.briefing {
    .briefing-content {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    h4 {
        margin-bottom: 5px;
        opacity: 0.7;
        text-transform: uppercase;
        font-size: 0.8em;
        letter-spacing: 0.1em;
    }

    ul {
        margin: 0;
        padding-left: 20px;
        list-style: disc;
    }
}
</style>
