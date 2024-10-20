<template>
    <div class="flex-col gap-md fullheight">
        <MapOverviewCard :map="map" :friendlyName="mapName" />
        <div class="teams scroll-container">
            <div v-if="isFFA">
                <div class="team-title">Players</div>
                <div class="contenders">
                    <template>
                        <template v-for="(contender, i) in replay.contenders" :key="`contender${i}`">
                            <BattlePreviewParticipant :contender="contender" />
                            <Icon
                                v-if="replay.winningTeamId === contender.allyTeamId && showSpoilers"
                                class="trophy"
                                :icon="trophyVariant"
                                height="18"
                            />
                        </template>
                    </template>
                </div>
            </div>
            <div v-for="[teamId, contenders] in teams" v-else :key="`team${teamId}`">
                <div class="team-title">
                    <div>Team {{ teamId + 1 }}</div>
                    <Icon v-if="replay.winningTeamId === teamId && showSpoilers" class="trophy" :icon="trophyVariant" height="18" />
                </div>
                <div class="contenders">
                    <BattlePreviewParticipant
                        v-for="(contender, contenderIndex) in contenders"
                        :key="`contender${contenderIndex}`"
                        :contender="contender"
                    />
                </div>
            </div>
            <div v-if="replay.spectators.length">
                <div class="team-title">Spectators</div>
                <div class="contenders">
                    <BattlePreviewParticipant
                        v-for="(spectator, spectatorIndex) in replay.spectators"
                        :key="`spectator${spectatorIndex}`"
                        :contender="spectator"
                    />
                </div>
            </div>
        </div>
        <div class="flex-row flex-bottom gap-md">
            <slot name="actions" :replay="replay"></slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import trophyVariant from "@iconify-icons/mdi/trophy-variant";
import { computed, ComputedRef } from "vue";

import BattlePreviewParticipant from "@renderer/components/battle/BattlePreviewParticipant.vue";
import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import { Replay } from "@main/content/replays/replay";
import { StartBox, StartPosType } from "@main/game/battle/battle-types";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { mapFileNameToFriendlyName } from "@main/content/maps/map-data";
import { groupBy } from "$/jaz-ts-utils/object";

const props = defineProps<{
    replay: Replay;
    showSpoilers?: boolean;
}>();

const replay = computed(() => props.replay);
const scriptName = computed(() => props.replay.mapScriptName || "");

const map = useDexieLiveQueryWithDeps([scriptName], () => {
    return db.maps.get(scriptName.value);
});

const mapName = computed(() => {
    return mapFileNameToFriendlyName(props.replay.mapScriptName);
});

const gameVersion = computed(() => props.replay.gameVersion);

const engineVersion = computed(() => props.replay.engineVersion);

const isFFA = computed(() => {
    return props.replay.preset === "ffa";
});

const teams = computed(() => {
    const teams = groupBy(props.replay.contenders, (contender) => contender.allyTeamId);
    const sortedTeams = new Map([...teams.entries()].sort());
    return sortedTeams;
});

const startPosType: ComputedRef<StartPosType> = computed(() => {
    return parseInt(props.replay.battleSettings.startpostype);
});

const startBoxes = computed(() => {
    if (startPosType.value !== StartPosType.Boxes) {
        return undefined;
    }
    const startBoxes: Record<number, StartBox | undefined> = {};
    // teams.value.forEach((team) => {
    //     if (team.startBox) {
    //         startBoxes[team.allyTeamId] = {
    //             xPercent: team.startBox.left,
    //             yPercent: team.startBox.top,
    //             widthPercent: team.startBox.right - team.startBox.left,
    //             heightPercent: team.startBox.bottom - team.startBox.top,
    //         };
    //     }
    // });
    return startBoxes;
});

const startPositions = computed(() => {
    const contenders = props.replay.contenders;
    return contenders.map((contender) => {
        if (!contender.startPos) {
            return;
        }
        return {
            position: contender.startPos,
            rgbColor: contender.rgbColor,
        };
    });
});
</script>

<style lang="scss" scoped>
.teams {
    gap: 5px;
}
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
