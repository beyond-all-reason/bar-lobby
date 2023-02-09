<template>
    <div class="container">
        <Panel class="voting-panel">
            <div class="title"><strong>Vote:</strong> {{ vote.title }}</div>

            <div class="actions">
                <Button class="vote-button green" @click="onYes">Yes (F1)</Button>
                <Button class="vote-button red" @click="onNo">No (F2)</Button>
            </div>

            <div class="vote-display">
                <div v-for="i in vote.yesVotes" :key="i" class="segment yes"></div>
                <div v-for="i in missingVotes" :key="i" class="segment"></div>
                <div v-for="i in vote.noVotes" :key="i" class="segment no"></div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Panel from "@/components/common/Panel.vue";
import Button from "@/components/controls/Button.vue";
import { SpadsVote } from "@/model/spads/spads-types";

const props = defineProps<{
    vote: SpadsVote;
}>();

const emits = defineEmits<{
    (event: "yes"): void;
    (event: "no"): void;
}>();

const missingVotes = computed(() => props.vote.maxVotes - props.vote.yesVotes - props.vote.noVotes);

function onYes() {
    emits("yes");
}

function onNo() {
    emits("no");
}
</script>

<style lang="scss" scoped>
.container {
    position: fixed;
    width: 100%;
    left: 0;
    margin-top: -15px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.voting-panel {
    background: radial-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9));
    border-radius: 7px;
    overflow: hidden;
    :deep(.content) {
        padding: 10px 15px;
        padding-bottom: 23px;
        gap: 10px;
        overflow: hidden;
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
    &.no {
        background: rgba(165, 30, 30, 0.6);
    }
}
</style>
