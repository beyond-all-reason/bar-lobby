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
            <Button class="slim" @click="addBotClicked(teamId)"> Add bot </Button>
            <Button v-if="showJoin" class="slim" @click="onJoinClicked(teamId)"> Join </Button>
        </div>
        <div class="participants">
            <div
                v-for="member in battleWithMetadataStore.teams[teamId]"
                :key="member.id"
                draggable="true"
                @dragstart="onDragStart($event, member)"
                @dragend="onDragEnd()"
            >
                <PlayerParticipant v-if="isPlayer(member)" :player="member" />
                <BotParticipant v-else-if="isBot(member)" :bot="member" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import BotParticipant from "@renderer/components/battle/BotParticipant.vue";
import PlayerParticipant from "@renderer/components/battle/PlayerParticipant.vue";
import Button from "@renderer/components/controls/Button.vue";
import { Bot, isBot, isPlayer, Player } from "@main/game/battle/battle-types";
import { battleWithMetadataStore, mePlayer } from "@renderer/store/battle.store";

const props = defineProps<{
    teamId: string;
}>();
const title = "Team " + (Number(props.teamId) + 1);

const memberCount = computed(() => {
    return battleWithMetadataStore.teams[props.teamId]?.length || 0;
});

const showJoin = computed(() => {
    return props.teamId !== mePlayer.battleStatus.teamId;
});

const emit = defineEmits(["addBotClicked", "onJoinClicked", "onDragStart", "onDragEnd", "onDragEnter", "onDrop"]);
function addBotClicked(teamId: string) {
    emit("addBotClicked", teamId);
}
function onJoinClicked(teamId: string) {
    emit("onJoinClicked", teamId);
}
function onDragStart(event: DragEvent, member: Player | Bot) {
    emit("onDragStart", event, member);
}
function onDragEnd() {
    emit("onDragEnd");
}
function onDragEnter(event: DragEvent, teamId: string) {
    emit("onDragEnter", event, teamId);
}
function onDrop(event: DragEvent, teamId: string) {
    emit("onDrop", event, teamId);
}
</script>

<style lang="scss" scoped>
.group {
    position: relative;
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
.team-members {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 5px;
}
</style>
