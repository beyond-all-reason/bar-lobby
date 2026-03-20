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
            v-if="mission && mission.difficulties.length > 0"
            v-model="selectedDifficulty"
            label="Difficulty"
            :options="mission.difficulties"
            optionLabel="name"
        />
        <DownloadContentButton
            v-if="mission"
            :maps="mapSpringName ? [mapSpringName] : []"
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
import { campaignCache } from "@renderer/store/campaign-cache";
import { MissionDifficulty, MissionModel } from "@main/content/game/mission";
import { Logger } from "@renderer/utils/log";

const log = new Logger("[campaignId]-[missionId].vue");

const router = useRouter();

const props = defineProps<{
    missionId: string;
    campaignId: string;
}>();

const gameVersion = gameStore?.selectedGameVersion?.gameVersion;

if (campaignCache.value.length === 0) {
    campaignCache.value = gameVersion ? await window.game.getCampaigns(gameVersion) : [];
}

const campaign = computed(() => campaignCache.value.find((c) => c.campaignId === props.campaignId));
const mission = computed(() => campaign.value?.missions.get(props.missionId));

const selectedDifficulty = ref<MissionDifficulty | undefined>(
    mission.value?.difficulties.find((d) => d.name === mission.value?.defaultDifficulty)
);

// The Lua comment says: "Lobby to replace spaces with underscores" for the map spring name.
const mapSpringName = computed(() => mission.value?.mapName.replaceAll(" ", "_") ?? "");

const map = useDexieLiveQueryWithDeps([mapSpringName], async () =>
    mapSpringName.value ? await db.maps.get(mapSpringName.value) : undefined
);

function startPosTypeToInt(type: string): number {
    switch (type) {
        case "fixed":
            return 0;
        case "random":
            return 1;
        case "chooseInGame":
            return 2;
        case "chooseBeforeGame":
        default:
            return 3;
    }
}

function buildScript(m: MissionModel): string {
    const difficulty = selectedDifficulty.value;
    const playerHandicap = difficulty?.playerhandicap ?? 0;
    const enemyHandicap = difficulty?.enemyhandicap ?? 0;

    const allyTeamSections: string[] = [];
    const teamSections: string[] = [];
    const playerSections: string[] = [];
    const aiSections: string[] = [];

    let playerName = "Player";
    let teamIdx = 0;
    let aiIdx = 0;
    let playerIdx = 0;

    const allyTeamsMap: Record<string, number> = {};
    const teamsMap: Record<string, number> = {};
    const aisMap: Record<number, string> = {};
    const playersMap: Record<number, string> = {};

    for (const [allyTeamName, allyTeam] of m.allyTeams) {
        const atIdx = allyTeamSections.length;
        allyTeamsMap[allyTeamName] = atIdx;
        let s = `\n    [allyteam${atIdx}] {\n        numallies=0;`;
        if (allyTeam.startRectLeft !== undefined) s += `\n        startrectleft=${allyTeam.startRectLeft};`;
        if (allyTeam.startRectTop !== undefined) s += `\n        startrecttop=${allyTeam.startRectTop};`;
        if (allyTeam.startRectRight !== undefined) s += `\n        startrectright=${allyTeam.startRectRight};`;
        if (allyTeam.startRectBottom !== undefined) s += `\n        startrectbottom=${allyTeam.startRectBottom};`;
        s += `\n    }`;
        allyTeamSections.push(s);

        const allyTeamHasPlayer = [...allyTeam.teams.values()].some((t) => !t.ai);

        for (const [teamName, team] of allyTeam.teams) {
            const thisTeamIdx = teamIdx++;
            teamsMap[teamName] = thisTeamIdx;
            const isAi = !!team.ai;
            const handicap = allyTeamHasPlayer ? playerHandicap : enemyHandicap;

            let ts = `\n    [team${thisTeamIdx}] {\n        teamleader=0;\n        allyteam=${atIdx};`;
            if (team.Side) ts += `\n        side=${team.Side};`;
            if (team.StartPosX !== undefined) ts += `\n        startposx=${team.StartPosX};`;
            if (team.StartPosZ !== undefined) ts += `\n        startposz=${team.StartPosZ};`;
            if (team.IncomeMultiplier !== undefined) ts += `\n        incomemultiplier=${team.IncomeMultiplier};`;
            if (handicap !== 0) ts += `\n        handicap=${handicap};`;
            ts += `\n    }`;
            teamSections.push(ts);

            if (isAi) {
                const thisAiIdx = aiIdx++;
                aisMap[thisTeamIdx] = team.name ?? teamName;
                let as = `\n    [ai${thisAiIdx}] {\n        shortname=${team.ai};`;
                if (team.name) as += `\n        name=${team.name};`;
                as += `\n        team=${thisTeamIdx};\n        host=0;\n    }`;
                aiSections.push(as);
            } else {
                const thisPlayerIdx = playerIdx++;
                playersMap[thisPlayerIdx] = team.name ?? teamName;
                playerName = team.name ?? teamName;
                playerSections.push(
                    `\n    [player${thisPlayerIdx}] {\n        name=${team.name ?? teamName};\n        team=${thisTeamIdx};\n    }`
                );
            }
        }
    }

    const missionOptions = {
        missionScriptPath: m.missionScriptPath,
        difficulty: selectedDifficulty.value?.name ?? "",
        allyTeams: allyTeamsMap,
        teams: teamsMap,
        ais: aisMap,
        players: playersMap,
    };
    log.info(`Mission options: ${JSON.stringify(missionOptions, null, 2)}`);
    const missionOptionsStr = btoa(JSON.stringify(missionOptions));

    const modSection = `\n    [modoptions] {${Object.entries(m.modOptions)
        .map(([k, v]) => `\n        ${k}=${v};`)
        .join("")}\n        missionoptions=${missionOptionsStr};\n    }`;

    const mapSection = Object.entries(m.mapOptions).length
        ? `\n    [mapoptions] {${Object.entries(m.mapOptions)
              .map(([k, v]) => `\n        ${k}=${v};`)
              .join("")}\n    }`
        : "";

    let restrictSection = "";
    if (m.unitLimits.size > 0) {
        let i = 0;
        const lines = [...m.unitLimits].map(([unit, limit]) => {
            const idx = i++;
            return `\n        unit${idx}=${unit};\n        limit${idx}=${limit};`;
        });
        restrictSection = `\n    [restrict] {\n        numrestrictions=${m.unitLimits.size};${lines.join("")}\n    }`;
    }

    return `[game] {
    gametype=${gameVersion ?? ""};
    mapname=${mapSpringName.value};
    startpostype=${startPosTypeToInt(m.startPosType)};
    ishost=1;
    myplayername=${playerName};${modSection}${mapSection}${restrictSection}${allyTeamSections.join("")}${teamSections.join("")}${playerSections.join("")}${aiSections.join("")}
}`;
}

async function launch() {
    if (!mission.value || !enginesStore.selectedEngineVersion) return;
    const script = buildScript(mission.value);
    await window.game.launchScript(script, gameVersion ?? "", enginesStore.selectedEngineVersion.id);
}

function goBack() {
    router.back();
}
</script>

<style></style>
