<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div key="spectators" class="group" data-type="group" @dragenter.prevent="onDragEnter($event)" @dragover.prevent @drop="onDrop($event)">
        <div class="flex-row flex-center-items gap-md">
            <div class="title">{{ title }}</div>
            <div v-if="memberCount > 0" class="member-count">({{ memberCount }} Member{{ memberCount > 1 ? "s" : "" }})</div>
            <Button v-if="showJoin" class="slim black" @click="onJoinClicked()"> Join </Button>
        </div>
        <div v-if="battleStore.isOnline" class="participants">
            <div v-if="queue">
                <div v-for="member in queueArray" :key="member.id" draggable="false">
                    <OnlineSpecParticipant :member="member" />
                </div>
            </div>
            <div v-else>
                <div v-for="member in spectatorArray" :key="member.id" draggable="false">
                    <OnlineSpecParticipant :member="member" />
                </div>
            </div>
        </div>
        <div v-else class="participants">
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
import { useTypedI18n } from "@renderer/i18n";

import SpectatorParticipant from "@renderer/components/battle/SpectatorParticipant.vue";
import OnlineSpecParticipant from "@renderer/components/battle/OnlineSpecParticipant.vue";
import Button from "@renderer/components/controls/Button.vue";
import { battleWithMetadataStore, battleStore } from "@renderer/store/battle.store";
import { Player } from "@main/game/battle/battle-types";
import { me } from "@renderer/store/me.store";
import { lobbyStore } from "@renderer/store/lobby.store";
import { UserId } from "tachyon-protocol/types";

const { t } = useTypedI18n();

const props = defineProps<{
    queue?: boolean;
}>();

const title = props.queue
    ? t("lobby.components.battle.spectatorsComponent.queue")
    : t("lobby.components.battle.spectatorsComponent.spectators");

const showJoin = computed(() => {
    return me.battleRoomState.isSpectator === false;
});

interface Member {
    id: UserId;
    joinQueuePostion?: number;
}

const spectatorArray = computed(() => {
    const arr: Member[] = [];
    if (!lobbyStore.activeLobby) return arr;
    for (const memberKey in lobbyStore.activeLobby.spectators) {
        const member = lobbyStore.activeLobby.spectators[memberKey];
        // Collect spectators without a queue position
        if (!member.joinQueuePosition) {
            arr.push(member);
        }
    }
    return arr;
});

// We already have a sorted array of UserIds, so we just make an array of the actual member data.
const queueArray = computed(() => {
    const arr: Member[] = [];
    if (!lobbyStore.activeLobby) return arr;
    if (!lobbyStore.activeLobby.playerQueue) return arr;
    //for (const userId of lobbyStore.activeLobby.playerQueue) {
    //    arr.push(lobbyStore.activeLobby.spectators[userId]);
    //}
    for (const value of lobbyStore.activeLobby.playerQueue.values()) {
        arr.push(lobbyStore.activeLobby.spectators[value]);
    }
    return arr;
});

const memberCount = computed(() => {
    if (battleStore.isOnline) {
        // We are returning the queued player count here
        if (props.queue) {
            return lobbyStore.activeLobby ? lobbyStore.activeLobby.playerQueue.size : 0;
        }
        // We are returning the unqueued spectator count here
        else {
            if (!lobbyStore.activeLobby?.spectatorCount) return 0;
            if (lobbyStore.activeLobby.playerQueue.size == 0) return lobbyStore.activeLobby.spectatorCount;
            return (
                lobbyStore.activeLobby.spectatorCount - (lobbyStore.activeLobby.playerQueue.size)
            );
        }
    } else return battleWithMetadataStore.spectators.length;
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
