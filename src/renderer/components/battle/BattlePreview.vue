<template>
    <div class="flex-col gap-md fullheight">
        <MapOverviewCard v-if="map" :map="map" :friendlyName="mapName" />
        <div class="teams scroll-container">
            <div v-if="isFFA">
                <div class="team-title">Players</div>
                <div class="contenders">
                    <template>
                        <template v-for="(contender, i) in battle.contenders" :key="`contender${i}`">
                            <BattlePreviewParticipant :contender="contender" />
                        </template>
                    </template>
                </div>
            </div>
            <!-- <div v-for="[teamId, contenders] in teams" v-else :key="`team${teamId}`">
                <div class="team-title">
                    <div>Team {{ teamId + 1 }}</div>
                </div>
                <div class="contenders">
                    <BattlePreviewParticipant v-for="contender in contenders" :key="contender.participantId" :contender="contender" />
                </div>
            </div> -->
            <div v-if="battle.spectators.length">
                <div class="team-title">Spectators</div>
                <div class="contenders">
                    <BattlePreviewParticipant
                        v-for="(spectator, spectatorIndex) in battle.spectators"
                        :key="`spectator${spectatorIndex}`"
                        :contender="spectator"
                    />
                </div>
            </div>
        </div>
        <div class="flex-row flex-bottom gap-md">
            <slot name="actions" :battle="battle"></slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import BattlePreviewParticipant from "@renderer/components/battle/BattlePreviewParticipant.vue";
import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import { db } from "@renderer/store/db";
import { computedAsync } from "@vueuse/core";
import { OngoingBattle } from "@main/content/replays/replay";

const props = defineProps<{
    battle: OngoingBattle;
    showSpoilers?: boolean;
}>();

const map = computedAsync(async () => {
    const allMaps = await db.maps.toArray();
    return allMaps.at(0);
    // return props.battle instanceof Battle
    //     ? await window.maps.getMapByScriptName(props.battle.battleOptions.map)
    //     : await window.maps.getMapByScriptName(props.battle.mapScriptName);
});

const mapName = computed(() => {
    return props.battle.battleSettings.map;
});

const isFFA = computed(() => {
    // TODO: get preset from spads/server
    return false;
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
