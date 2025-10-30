<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-md fullheight">
        <TabView>
            <TabPanel header="Map">
                <ReplayPreviewMap :replay="replay" />
            </TabPanel>
            <TabPanel header="Details">
                <div class="scroll-container flex-col" style="height: 550px">
                    <div class="teams padding-bottom-sm">
                        <div v-if="isFFA">
                            <div class="team-title">{{ t("lobby.components.battle.replayPreview.players") }}</div>
                            <div class="contenders">
                                <template v-for="(contender, i) in replay?.contenders" :key="`contender${i}`">
                                    <BattlePreviewParticipant :contender="contender" />
                                    <Icon
                                        v-if="replay?.winningTeamId === contender.allyTeamId && showSpoilers"
                                        class="trophy"
                                        :icon="trophyVariant"
                                        height="18"
                                    />
                                </template>
                            </div>
                        </div>
                        <div v-for="[teamId, contenders] in teams" v-else :key="`team${teamId}`">
                            <div class="team-title">
                                <div>Team {{ teamId + 1 }}</div>
                                <Icon
                                    v-if="replay?.winningTeamId === teamId && showSpoilers"
                                    class="trophy"
                                    :icon="trophyVariant"
                                    height="18"
                                />
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
                            <div class="team-title">{{ t("lobby.components.battle.replayPreview.spectators") }}</div>
                            <div class="contenders">
                                <BattlePreviewParticipant
                                    v-for="(spectator, spectatorIndex) in replay.spectators"
                                    :key="`spectator${spectatorIndex}`"
                                    :contender="spectator"
                                />
                            </div>
                        </div>
                    </div>
                    <hr class="margin-top-md margin-bottom-md divider" />
                    <div class="padding-top-sm">
                        <div v-for="(item, index) in extraDetails" :key="index">
                            <div>
                                <div :class="getStripeResult(index)">
                                    <div class="margin-left-sm padding-top-sm padding-bottom-sm">
                                        <p class="txt-xs">
                                            <b>{{ item.title }}</b>
                                        </p>
                                    </div>
                                    <div class="margin-right-sm padding-top-sm padding-bottom-sm txt-right">
                                        <p class="txt-xs">{{ item.data }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>
        </TabView>
        <div class="flex-bottom gap-md padding-left-md padding-right-md">
            <slot name="actions" :replay="replay"></slot>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import trophyVariant from "@iconify-icons/mdi/trophy-variant";
import { computed } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import BattlePreviewParticipant from "@renderer/components/battle/BattlePreviewParticipant.vue";
import { Replay } from "@main/content/replays/replay";
import ReplayPreviewMap from "@renderer/components/maps/ReplayPreviewMap.vue";
import { DemoModel } from "$/sdfz-demo-parser";
import TabView from "@renderer/components/common/TabView.vue";
import TabPanel from "primevue/tabpanel";

const { t } = useTypedI18n();

const props = defineProps<{
    replay: Replay;
    showSpoilers?: boolean;
}>();

const isFFA = computed(() => {
    return props.replay?.preset === "ffa";
});

const teams = computed<Map<number, (DemoModel.Info.Player | DemoModel.Info.AI)[]>>(() => {
    if (!props.replay) {
        return new Map();
    }
    const teams = Map.groupBy(props.replay.contenders, (contender) => contender.allyTeamId);
    const sortedTeams = new Map([...teams.entries()].sort());
    return sortedTeams;
});

// The space will scroll if enough items are added to this list.
const extraDetails = computed(() => {
    return [
        {
            title: t('lobby.components.battle.replayPreview.game-version'),
            data: props.replay.engineVersion,
        },
        {
            title: t('lobby.components.battle.replayPreview.game-version'),
            data: props.replay.gameVersion,
        },
    ];
});

function getStripeResult(index: number) {
    return index & 1 ? "datagrid" : "datagrid datagridstripe";
}
</script>

<style lang="scss" scoped>
.teams {
    gap: 5px;
    height: auto;
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
.datagrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: auto;
}
.datagridstripe {
    background-color: #00000033;
}
.autoheight {
    height: auto;
}
.divider {
    background: rgba(255, 255, 255, 0.3);
}
</style>
