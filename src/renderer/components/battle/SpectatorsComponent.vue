<template>
    <div key="spectators" class="group" data-type="group" @dragenter.prevent="onDragEnter($event)" @dragover.prevent @drop="onDrop($event)">
        <div class="flex-row flex-center-items gap-md">
            <div class="title">{{ title }}</div>
            <div v-if="memberCount > 0" class="member-count">({{ memberCount }} Member{{ memberCount > 1 ? "s" : "" }})</div>
            <Button v-if="showJoin" class="slim black" @click="onJoinClicked()"> Join </Button>
        </div>
        <div class="participants">
            <div
                v-for="player in battleWithMetadataStore.spectators"
                :key="player.id"
                draggable="true"
                @dragstart="onDragStart($event, player)"
                @dragend="onDragEnd()"
            >
                <SpectatorParticipant :player="player" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import SpectatorParticipant from "@renderer/components/battle/SpectatorParticipant.vue";
import Button from "@renderer/components/controls/Button.vue";
import { battleWithMetadataStore } from "@renderer/store/battle.store";
import { Player } from "@main/game/battle/battle-types";
import { me } from "@renderer/store/me.store";

const title = "Spectators";

const showJoin = computed(() => {
    return me.battleRoomState.isSpectator === false;
});

const memberCount = computed(() => {
    return battleWithMetadataStore.spectators.length;
});

const emit = defineEmits(["onJoinClicked", "onDragStart", "onDragEnd", "onDragEnter", "onDrop"]);

function onJoinClicked() {
    emit("onJoinClicked");
}

// TODO probably need to emit with a isSpectator flag
function onDragStart(event: DragEvent, member: Player) {
    emit("onDragStart", event, member);
}
function onDragEnd() {
    emit("onDragEnd");
}
function onDragEnter(event: DragEvent) {
    emit("onDragEnter", event);
}
function onDrop(event: DragEvent) {
    emit("onDrop", event);
}
</script>

<style lang="scss" scoped>
.group {
    border: 1px inset rgba(255, 255, 255, 0.1);
    background: radial-gradient(circle, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8));
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    min-height: 100px;
    padding: 10px;
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
.participants {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 5px;
    .spectators & {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
}
</style>
