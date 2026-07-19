<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="choice-level" :style="{ '--choice-count': choices.length }">
        <button
            v-for="choice in choices"
            :key="choice.id"
            class="choice-item"
            :class="choice.id"
            :data-choice-id="choice.id"
            :disabled="choice.disabled"
            type="button"
            @click="emit('selected', choice.id)"
        >
            <span class="art" :style="{ backgroundImage: `url(${choice.artwork})` }" aria-hidden="true"></span>
            <span class="content">
                <span v-if="choice.eyebrow" class="eyebrow">{{ choice.eyebrow }}</span>
                <span class="title">{{ choice.title }}</span>
                <span v-if="choice.description" class="description">
                    {{ choice.description }}
                </span>
                <span v-if="choice.summary" class="summary">{{ choice.summary }}</span>
                <span v-if="choice.actionLabel" class="action">{{ choice.actionLabel }}</span>
            </span>
        </button>
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
</script>

<style lang="scss" scoped>
.choice-level {
    display: flex;
    height: 100%;
    overflow: hidden;
    container-type: inline-size;
}

.choice-item {
    position: relative;
    isolation: isolate;
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 0;
    padding: 0;
    color: white;
    background: #10171e;
    cursor: pointer;
    text-align: center;
    filter: brightness(0.85);
    transform: skewX(-5deg);
    transition:
        flex 300ms ease,
        filter 300ms ease,
        transform 300ms ease;

    &::after {
        position: absolute;
        z-index: -1;
        inset: 0;
        background: linear-gradient(180deg, rgba(6, 10, 14, 0.18), rgba(6, 10, 14, 0.78));
        content: "";
    }

    &:not(:disabled):hover,
    &:not(:disabled):focus-visible {
        z-index: 1;
        flex: 1.15;
        filter: brightness(1.15);
        outline: none;
        transform: scale(1.025) skewX(-5deg);
    }
}

.choice-item:disabled {
    cursor: not-allowed;
    filter: brightness(0.5);
}

.art {
    position: absolute;
    z-index: -2;
    inset: -2px -80px;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    transform: skewX(5deg) scale(1.03);
}

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: min(460px, calc(100cqw / var(--choice-count) - 48px));
    gap: 20px;
    transform: skewX(5deg);
}

.eyebrow,
.action {
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.08em;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    text-transform: uppercase;
}

.description {
    font-size: 1.6rem;
    font-weight: 600;
}

.summary {
    font-size: 1.2rem;
}
</style>
