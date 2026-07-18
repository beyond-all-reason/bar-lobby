<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mode-select">
        <div
            v-for="choice in choices"
            :key="choice.id"
            :class="['mode-column', choice.id, { disabled: choice.disabled }]"
            :data-choice-id="choice.id"
            :style="{ backgroundImage: `url(${choice.backgroundImage})` }"
            @click="selectChoice(choice)"
        >
            <span>{{ choice.label }}</span>
            <button class="quick-play-button" type="button" :disabled="choice.disabled">
                {{ choice.description }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { DiagonalChoice } from "@renderer/components/battle/diagonal-choice.types";

defineProps<{
    choices: DiagonalChoice[];
}>();

const emit = defineEmits<{
    selected: [id: string];
}>();

function selectChoice(choice: DiagonalChoice) {
    if (!choice.disabled) {
        emit("selected", choice.id);
    }
}
</script>

<style lang="scss" scoped>
.mode-select {
    display: flex;
    height: 100%;
    overflow: visible;
}

.mode-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    color: white;
    font-size: 2rem;
    text-align: center;
    transition: all 0.3s ease;
    filter: brightness(0.7);
    transform: skewX(-5deg);
    padding-top: 30px;

    span {
        font-size: 2rem;
        text-transform: uppercase;
        font-weight: bold;
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    }
}

.mode-column:last-child {
    border-right: none;
}

.mode-column:hover:not(.disabled) {
    flex: 1.5;
    z-index: 1;
    filter: brightness(1);
    transform: scale(1.05) skewX(0deg);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
}

.mode-column.disabled {
    cursor: not-allowed;
    filter: brightness(0.5);
}

.quick-play-button {
    height: 120px;
    width: 100%;
    align-self: center;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px calc(50% - 122px);
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.quick-play-button:hover {
    box-shadow: 0 12px 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button:hover::before {
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
}
</style>
