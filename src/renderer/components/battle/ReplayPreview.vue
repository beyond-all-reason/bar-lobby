<template>
    <div class="flex-col gap-md fullheight">
        <ReplayPreviewMap :replay="replay" />
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
            <div v-if="replay?.spectators.length">
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
import { computed } from "vue";
import BattlePreviewParticipant from "@renderer/components/battle/BattlePreviewParticipant.vue";
import { Replay } from "@main/content/replays/replay";
import ReplayPreviewMap from "@renderer/components/maps/ReplayPreviewMap.vue";

const props = defineProps<{
    replay?: Replay;
    showSpoilers?: boolean;
}>();

const isFFA = computed(() => {
    return props.replay?.preset === "ffa";
});

const teams = computed(() => {
    if (!props.replay) {
        return [];
    }
    const teams = Map.groupBy(props.replay.contenders, (contender) => contender.allyTeamId);
    const sortedTeams = new Map([...teams.entries()].sort());
    return sortedTeams;
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
