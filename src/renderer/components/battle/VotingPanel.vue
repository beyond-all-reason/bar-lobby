<template>
    <div class="voting-container">
        <Panel class="voting-panel">
            <div :class="['remaining-time', { animating: showTimeRemaining }]"></div>

            <div class="title"><strong>Vote:</strong> {{ vote.command }}</div>

            <div class="actions">
                <Button class="vote-button green" @click="onYes" @keyup.f1="onYes">Yes (F1)</Button>
                <Button class="vote-button red" @click="onNo">No (F2)</Button>
            </div>

            <div v-if="vote.callerName" class="caller">Called by {{ vote.callerName }}</div>

            <div v-if="missingYesVotes" class="vote-display">
                <div v-for="i in vote.yesVotes" :key="i" class="segment yes"></div>
                <div v-for="i in missingYesVotes" :key="i" class="segment missing-yes"></div>
                <div v-for="i in missingNoVotes" :key="i" class="segment missing-no"></div>
                <div v-for="i in vote.noVotes" :key="i" class="segment no"></div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { onKeyStroke } from "@vueuse/core";
import { computed, ref, watch } from "vue";

import Panel from "@/components/common/Panel.vue";
import Button from "@/components/controls/Button.vue";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { SpadsVote } from "@/model/spads/spads-types";

const props = defineProps<{
    vote: SpadsVote;
    battle: SpadsBattle;
}>();

const missingYesVotes = computed(() => {
    if (props.vote.requiredYesVotes === undefined || props.vote.yesVotes === undefined) {
        return null;
    }
    return props.vote.requiredYesVotes - props.vote.yesVotes;
});
const missingNoVotes = computed(() => {
    if (props.vote.requiredNoVotes === undefined || props.vote.noVotes === undefined) {
        return null;
    }
    return props.vote.requiredNoVotes - props.vote.noVotes;
});

const remainingTimeDurationCss = ref("60s");
const showTimeRemaining = ref(false);
watch(
    () => props.vote.secondsRemaining,
    (newValue, oldValue) => {
        if (newValue && !oldValue) {
            remainingTimeDurationCss.value = `${newValue}s`;
            showTimeRemaining.value = true;
        } else if (!newValue) {
            showTimeRemaining.value = false;
        }
    }
);

onKeyStroke("F1", onYes);
onKeyStroke("F2", onNo);

function onYes() {
    api.comms.request("c.lobby.message", {
        message: "!vote y",
    });
}

function onNo() {
    api.comms.request("c.lobby.message", {
        message: "!vote n",
    });
}
</script>

<style lang="scss" scoped>
.voting-container {
    position: fixed;
    width: 100%;
    left: 0;
    margin-top: -15px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
.voting-panel {
    background: radial-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9));
    border-radius: 7px;
    overflow: hidden;
    pointer-events: auto;
    :deep(.content) {
        padding: 10px 15px;
        padding-top: 13px;
        padding-bottom: 23px;
        gap: 10px;
        overflow: hidden;
    }
}
.remaining-time {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.15);
    transform: scaleX(1);
    visibility: hidden;
    &.animating {
        visibility: visible;
        transition-property: transform;
        transition-timing-function: linear;
        transition-duration: v-bind(remainingTimeDurationCss);
        transform: scaleX(0);
    }
}
.title {
    text-align: center;
    font-size: 24px;
}
.actions {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;
    gap: 10px;
}
.vote-button {
    font-size: 20px;
    font-weight: 600;
    flex-grow: 1;
}
.caller {
    text-align: center;
    font-size: 14px;
    opacity: 0.8;
}
.vote-display {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 10px;
    display: flex;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.1);
}
.segment {
    flex-grow: 1;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    &:not(:last-child) {
        border-right: 1px solid rgba(0, 0, 0, 0.3);
    }
    &.yes {
        background: rgba(96, 216, 26, 0.6);
    }
    &.missing-yes {
        background: rgba(96, 216, 26, 0.247);
    }
    &.no {
        background: rgba(165, 30, 30, 0.6);
    }
    &.missing-no {
        background: rgba(165, 30, 30, 0.164);
    }
}
</style>
