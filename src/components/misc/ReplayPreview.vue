<template>
    <div class="flex-col gap-md">
        <MapPreview :map="replay.mapScriptName" :isSpectator="true" :myTeamId="0" :startBoxes="startBoxes" :startPosType="startPosType" :startPositions="startPositions" />

        <div v-if="replay.preset === 'ffa'">
            <div class="team-title">Players</div>
            <div class="contenders">
                <template v-for="(contender, contenderIndex) in replay.contenders" :key="`contender${contenderIndex}`">
                    <ReplayParticipant :contender="contender" />
                    <Icon v-if="replay.winningTeamId === contender.allyTeamId && showSpoilers" class="trophy" :icon="trophyVariant" height="18" />
                </template>
            </div>
        </div>

        <div v-for="[teamId, contenders] in teams" v-else :key="`team${teamId}`">
            <div class="team-title">
                <div>Team {{ teamId + 1 }}</div>
                <Icon v-if="replay.winningTeamId === teamId && showSpoilers" class="trophy" :icon="trophyVariant" height="18" />
            </div>
            <div class="contenders">
                <ReplayParticipant v-for="(contender, contenderIndex) in contenders" :key="`contender${contenderIndex}`" :contender="contender" />
            </div>
        </div>

        <div v-if="replay.spectators.length">
            <div class="team-title">Spectators</div>
            <div class="contenders">
                <ReplayParticipant v-for="(spectator, spectatorIndex) in replay.spectators" :key="`spectator${spectatorIndex}`" :contender="spectator" />
            </div>
        </div>

        <hr />

        <div class="gridform">
            <div>Map</div>
            <div class="flex-row gap-sm">
                <Icon v-if="mapInstalled" class="inline-icon check" :icon="checkBold" height="18" />
                <Icon v-else class="inline-icon cross" :icon="closeThick" height="18" />
                {{ replay.mapScriptName }}
            </div>

            <div>Game</div>
            <div class="flex-row gap-sm">
                <Icon v-if="gameInstalled" class="inline-icon check" :icon="checkBold" height="18" />
                <Icon v-else class="inline-icon cross" :icon="closeThick" height="18" />
                {{ replay.gameVersion }}
            </div>

            <div>Engine</div>
            <div class="flex-row gap-sm">
                <Icon v-if="engineInstalled" class="inline-icon check" :icon="checkBold" height="18" />
                <Icon v-else class="inline-icon cross" :icon="closeThick" height="18" />
                {{ replay.engineVersion }}
            </div>
        </div>

        <div class="flex-row gap-md">
            <Button v-if="synced" class="green" @click="watch">Watch</Button>
            <Button v-else class="blue" :disabled="contentIsDownloading" @click="downloadMissingContent">Download Missing Content</Button>

            <Button @click="showFile">Show File</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import closeThick from "@iconify-icons/mdi/close-thick";
import trophyVariant from "@iconify-icons/mdi/trophy-variant";
import { shell } from "electron";
import { groupBy } from "jaz-ts-utils";
import path from "path";
import { computed } from "vue";

import MapPreview from "@/components/battle/MapPreview.vue";
import Button from "@/components/controls/Button.vue";
import ReplayParticipant from "@/components/misc/ReplayParticipant.vue";
import { StartBox, StartPosType } from "@/model/battle/types";
import { Replay } from "@/model/replay";

const props = defineProps<{
    replay: Replay;
    showSpoilers: boolean;
}>();

const mapInstalled = computed(() => api.content.maps.installedMaps.some((map) => map.scriptName === props.replay.mapScriptName));
const gameInstalled = computed(() => api.content.game.installedVersions.some((version) => version === props.replay.gameVersion));
const engineInstalled = computed(() => api.content.engine.installedVersions.some((version) => version === props.replay.engineVersion));
const synced = computed(() => mapInstalled.value && gameInstalled.value && engineInstalled.value);
const contentIsDownloading = computed(() => {
    const isMapDownloading = api.content.maps.currentDownloads.some((dl) => dl.name === props.replay.mapScriptName);
    const isGameDownloading = api.content.game.currentDownloads.some((dl) => dl.name === props.replay.gameVersion);
    const isEngineDownloading = api.content.engine.currentDownloads.some((dl) => dl.name === props.replay.engineVersion);
    return isMapDownloading || isGameDownloading || isEngineDownloading;
});
const startPosType = computed(() => parseInt(props.replay.battleSettings.startpostype ?? 0) as StartPosType);
const startBoxes = computed(() => {
    if (startPosType.value !== StartPosType.Boxes) {
        return undefined;
    }
    const startBoxes: Record<number, StartBox | undefined> = {};
    props.replay.teams.forEach((team) => {
        if (team.startBox) {
            startBoxes[team.allyTeamId] = {
                xPercent: team.startBox.left,
                yPercent: team.startBox.top,
                widthPercent: team.startBox.right - team.startBox.left,
                heightPercent: team.startBox.bottom - team.startBox.top,
            };
        }
    });
    return startBoxes;
});
const startPositions = computed(() => {
    return props.replay.contenders.map((contender) => {
        if (!contender.startPos) {
            return;
        }
        return {
            position: contender.startPos,
            rgbColor: contender.rgbColor,
        };
    });
});
const teams = computed(() => {
    const teams = groupBy(props.replay.contenders, (player) => player.allyTeamId);
    const sortedTeams = new Map([...teams.entries()].sort());
    return sortedTeams;
});

const downloadMissingContent = () => {
    if (!mapInstalled.value) {
        api.content.maps.installMaps(props.replay.mapScriptName);
    }
    if (!gameInstalled.value) {
        api.content.game.downloadGame(props.replay.gameVersion);
    }
    if (!engineInstalled.value) {
        api.content.engine.downloadEngine(props.replay.engineVersion);
    }
};

const watch = () => {
    api.game.launch({ replay: props.replay });
};

const showFile = () => {
    shell.showItemInFolder(path.join(api.content.replays.replaysDir, props.replay.fileName));
};
</script>

<style lang="scss" scoped>
.team-title {
    display: flex;
    flex-direction: row;
    gap: 10px;
    font-weight: 500;
    margin-bottom: 3px;
}
.contenders {
    display: flex;
    flex-direction: row;
    gap: 4px;
    flex-wrap: wrap;
}
.inline-icon {
    margin-top: 2px;
}
.trophy {
    color: #ffbc00;
    display: flex;
    align-self: center;
    margin-bottom: 1px;
}
.check {
    color: rgb(94, 230, 16);
}
.cross {
    color: rgb(223, 35, 35);
}
</style>
