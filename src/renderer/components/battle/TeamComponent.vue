<template>
    <div
        :key="`team${teamId}`"
        class="group"
        data-type="group"
        @dragenter.prevent="onDragEnter($event, teamId)"
        @dragover.prevent
        @drop="onDrop($event, teamId)"
    >
        <div class="flex-row flex-center-items gap-md">
            <div class="title">{{ title }}</div>
            <div v-if="memberCount > 0" class="member-count">({{ memberCount }} Member{{ memberCount > 1 ? "s" : "" }})</div>
            <Button v-if="!isSpectator" class="slim" @click="addBotClicked(teamId)"> Add bot </Button>
            <Button v-if="showJoin" class="slim" @click="onJoinClicked(teamId)"> Join </Button>
        </div>
        <div class="participants">
            <div
                v-for="(member, memberIndex) in members"
                :key="`member${memberIndex}`"
                draggable="true"
                @dragstart="onDragStart($event, member)"
                @dragend="onDragEnd()"
            >
                <PlayerParticipant v-if="'userId' in member" :battle="battle" :player="member" />
                <BotParticipant v-else :battle="battle" :bot="member" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import BotParticipant from "@/components/battle/BotParticipant.vue";
import PlayerParticipant from "@/components/battle/PlayerParticipant.vue";
import Button from "@/components/controls/Button.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/battle-types";
import { CurrentUser, User } from "@/model/user";

const props = defineProps<{
    battle: AbstractBattle;
    teamId: number;
    me: CurrentUser;
}>();
const isSpectator = computed(() => {
    return props.teamId < 0;
});
const title = computed(() => {
    return isSpectator.value ? "Spectators" : "Team " + (props.teamId + 1);
});
const members = computed(() => {
    const battle = props.battle;
    return isSpectator.value ? battle.spectators.value : battle.teams.value.get(props.teamId);
});
const showJoin = computed(() => {
    const playerIsSpectator = props.me.battleStatus.isSpectator;
    const playerTeam = playerIsSpectator ? -1 : props.me.battleStatus.teamId;
    const listTeam = props.teamId;
    const listIsSpectator = props.teamId < 0;
    return playerTeam !== listTeam || (listIsSpectator && !playerIsSpectator);
});
const memberCount = computed(() => {
    return isSpectator.value ? props.battle.spectators.value.length : props.battle.teams.value.get(props.teamId)?.length ?? 0;
});
const emit = defineEmits(["addBotClicked", "onJoinClicked", "onDragStart", "onDragEnd", "onDragEnter", "onDrop"]);
function addBotClicked(teamId: number) {
    emit("addBotClicked", teamId);
}
function onJoinClicked(teamId: number) {
    emit("onJoinClicked", teamId);
}
function onDragStart(event: DragEvent, member: User | Bot) {
    emit("onDragStart", event, member);
}
function onDragEnd() {
    emit("onDragEnd");
}
function onDragEnter(event: DragEvent, teamId: number) {
    emit("onDragEnter", event, teamId);
}
function onDrop(event: DragEvent, teamId: number) {
    emit("onDrop", event, teamId);
}
</script>

<style lang="scss" scoped>
.group {
    position: relative;
    &:not(:last-child):after {
        content: "";
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        width: 100%;
        height: 1px;
        margin: 10px 0;
    }
    &.highlight {
        &:before {
            @extend .fullsize;
            width: calc(100% + 10px);
            height: calc(100%);
            left: -5px;
            top: -5px;
            background: rgba(255, 255, 255, 0.1);
        }
    }
    &.highlight-error {
        &:before {
            @extend .fullsize;
            width: calc(100% + 10px);
            height: calc(100%);
            left: -5px;
            top: -5px;
            background: rgba(255, 100, 100, 0.1);
        }
    }
}
.title {
    font-size: 20px;
}
.member-count {
    display: inline-block;
    opacity: 0.5;
    vertical-align: middle;
}
.participants {
    display: flex;
    flex-direction: row;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 5px;
}
</style>
