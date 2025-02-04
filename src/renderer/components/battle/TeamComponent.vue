<template>
    <div
        :key="`team${teamId}`"
        class="group"
        :class="{
            raptor: isRaptorTeam(teamId),
            scavenger: isScavengerTeam(teamId),
        }"
        data-type="group"
        @dragenter.prevent="onDragEnter($event, teamId)"
        @dragover.prevent
        @drop="onDrop($event, teamId)"
    >
        <div class="group-header flex-row flex-center-items gap-md">
            <div class="title">{{ title }}</div>
            <div class="member-count" v-if="!isRaptorTeam(teamId) && !isScavengerTeam(teamId)">
                ({{ memberCount }}/{{ maxPlayersPerTeam }} players)
            </div>
            <Button class="slim black" @click="addBotClicked(teamId)" v-if="!isRaptorTeam(teamId) && !isScavengerTeam(teamId)">
                Add bot
            </Button>
            <!-- <Button v-if="showJoin" class="slim black" @click="onJoinClicked(teamId)">Join</Button> -->
        </div>
        <div
            v-for="member in battleWithMetadataStore.teams[teamId]"
            :key="member.id"
            :draggable="!isRaptorTeam(teamId) && !isScavengerTeam(teamId)"
            @dragstart="onDragStart($event, member)"
            @dragend="onDragEnd()"
            class="participant"
        >
            <PlayerParticipant v-if="isPlayer(member)" :player="member" />
            <BotParticipant v-else-if="isBot(member)" :bot="member" :team-id="teamId" />
        </div>
        <div v-if="!isRaptorTeam(teamId) && !isScavengerTeam(teamId)">
            <div v-for="(_, i) in maxPlayersPerTeam > 0 ? maxPlayersPerTeam - memberCount : 1" :key="i">
                <button class="join-button" :class="{ first: i === 0 }" @click="onJoinClicked(teamId)">Join</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import BotParticipant from "@renderer/components/battle/BotParticipant.vue";
import PlayerParticipant from "@renderer/components/battle/PlayerParticipant.vue";
import Button from "@renderer/components/controls/Button.vue";
import { Bot, isBot, isPlayer, isRaptor, isScavenger, Player, StartPosType } from "@main/game/battle/battle-types";
import { battleWithMetadataStore } from "@renderer/store/battle.store";

const props = defineProps<{
    teamId: number;
}>();
const title = isScavengerTeam(props.teamId) ? "Scavengers" : isRaptorTeam(props.teamId) ? "Raptors" : "Team " + (Number(props.teamId) + 1);

const memberCount = computed(() => {
    return battleWithMetadataStore.teams[props.teamId]?.length || 0;
});

const maxPlayersPerTeam = computed(() => {
    if (!battleWithMetadataStore.battleOptions.map) return 1;
    if (battleWithMetadataStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes)
        return battleWithMetadataStore.battleOptions.map.startboxesSet[battleWithMetadataStore.battleOptions.mapOptions.startBoxesIndex]
            ?.maxPlayersPerStartbox;
    if (battleWithMetadataStore.battleOptions.mapOptions.startPosType in [StartPosType.Fixed, StartPosType.Random])
        return battleWithMetadataStore.battleOptions.map.startPos.team[
            battleWithMetadataStore.battleOptions.mapOptions.fixedPositionsIndex ?? 0
        ].playersPerTeam;
    return 1;
});

function isRaptorTeam(teamId: number) {
    return battleWithMetadataStore.teams[teamId].some((member) => isBot(member) && isRaptor(member));
}
function isScavengerTeam(teamId: number) {
    return battleWithMetadataStore.teams[teamId].some((member) => isBot(member) && isScavenger(member));
}

// const showJoin = computed(() => {
//     return props.teamId !== me.battleRoomState.teamId;
// });

const emit = defineEmits(["addBotClicked", "onJoinClicked", "onDragStart", "onDragEnd", "onDragEnter", "onDrop"]);
function addBotClicked(teamId: number) {
    emit("addBotClicked", teamId);
}

function onJoinClicked(teamId: number) {
    emit("onJoinClicked", teamId);
}

function onDragStart(event: DragEvent, member: Player | Bot) {
    emit("onDragStart", event, member);
}

function onDragEnd() {
    if (isRaptorTeam(props.teamId) || isScavengerTeam(props.teamId)) return;
    emit("onDragEnd");
}

function onDragEnter(event: DragEvent, teamId: number) {
    if (isRaptorTeam(props.teamId) || isScavengerTeam(props.teamId)) return;
    emit("onDragEnter", event, teamId);
}

function onDrop(event: DragEvent, teamId: number) {
    if (isRaptorTeam(props.teamId) || isScavengerTeam(props.teamId)) return;
    emit("onDrop", event, teamId);
}
</script>

<style lang="scss" scoped>
.group {
    border: 1px inset rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.5);
    min-height: 100px;
    padding: 10px;
    position: relative;
    display: flex;
    flex-direction: column;
    &.highlight {
        &:before {
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.1);
        }
    }
    &.highlight-error {
        &:before {
            width: 100%;
            height: 100%;
            background: rgba(255, 100, 100, 0.1);
        }
    }
    &.raptor {
        border-color: rgb(206, 73, 73);
        background-image: url("/src/renderer/assets/images/modes/raptors.jpg");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }
    &.scavenger {
        border-color: rgb(135, 69, 176);
        background-image: url("/src/renderer/assets/images/modes/scavengers.webp");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }
}

.group-header {
    margin-bottom: 4px;
}

.participant {
    height: 46px;
}

.title {
    font-size: 20px;
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8));
}

.member-count {
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8));
    display: inline-block;
    vertical-align: middle;
}

.team-members {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 5px;
}

.join-button {
    height: 46px;
    &.first {
        border-top: none;
    }
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px;
    width: 100%;
    text-align: center;
    text-transform: uppercase;
    text-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    font-size: 1.2em;
    color: rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background-color: rgba(255, 255, 255, 0.05);
    }
}
</style>
