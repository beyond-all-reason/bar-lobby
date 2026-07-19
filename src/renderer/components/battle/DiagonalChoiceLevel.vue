<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div
        class="choice-level"
        :class="transitionRole && `is-${transitionRole}`"
        :style="{ '--choice-count': choices.length }"
        :data-testid="transitionRole ? `choice-level-${transitionRole}` : undefined"
        @animationend="onAnimationEnd"
    >
        <button
            v-for="choice in choices"
            :key="choice.id"
            class="choice-item presentation-detailed"
            :class="[
                {
                    recommended: choice.emphasis === 'recommended',
                    'is-selected': choice.id === selectedId,
                    'is-sibling': selectedId !== undefined && choice.id !== selectedId,
                },
            ]"
            :data-choice-id="choice.id"
            :disabled="!interactive || choice.disabled"
            type="button"
            @click="emit('selected', choice.id)"
        >
            <span
                v-if="choice.artwork"
                class="art"
                :style="{ backgroundImage: `url(${choice.artwork})` }"
                :data-testid="choice.artworkTestId"
                aria-hidden="true"
            ></span>
            <span class="content">
                <span v-if="choice.eyebrow" class="eyebrow">{{ choice.eyebrow }}</span>
                <span class="title">{{ choice.title }}</span>
                <span v-if="choice.description" class="description">{{ choice.description }}</span>
                <span v-if="choice.summary" class="summary">{{ choice.summary }}</span>
                <span v-if="choice.actionLabel" class="action">{{ choice.actionLabel }}</span>
            </span>
        </button>
    </div>
</template>

<script lang="ts" setup>
import type { DiagonalChoice } from "@renderer/components/battle/diagonal-choice.types";

type ChoiceLevelItem = DiagonalChoice & {
    emphasis?: "recommended";
    testId?: string;
    artworkTestId?: string;
};

withDefaults(
    defineProps<{
        choices: ChoiceLevelItem[];
        selectedId?: string;
        transitionRole?: "branch-expanding" | "branch-expanded" | "child-entering" | "child-exiting" | "branch-collapsing";
        interactive?: boolean;
    }>(),
    { selectedId: undefined, transitionRole: undefined, interactive: true }
);

const emit = defineEmits<{
    selected: [id: string];
    "transition-complete": [];
}>();

function onAnimationEnd(event: AnimationEvent) {
    if (event.target === event.currentTarget) emit("transition-complete");
}
</script>

<style lang="scss" scoped>
$forward-branch-duration: 300ms;
$forward-swipe-duration: 220ms;
$back-swipe-duration: 280ms;
$back-branch-duration: 360ms;

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

.is-branch-expanding,
.is-branch-expanded,
.is-child-entering,
.is-child-exiting,
.is-branch-collapsing {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.is-branch-expanding,
.is-branch-collapsing {
    z-index: 1;

    .choice-item {
        transition: none;
    }
}

.is-branch-expanding {
    animation: hold-level $forward-branch-duration linear both;

    .choice-item.is-selected {
        animation: expand-selected $forward-branch-duration cubic-bezier(0.2, 0.75, 0.2, 1) both;
    }

    .choice-item.is-sibling {
        animation: contract-sibling $forward-branch-duration cubic-bezier(0.2, 0.75, 0.2, 1) both;
    }
}

.is-branch-expanded {
    z-index: 1;

    .choice-item {
        transition: none;
    }

    .choice-item.is-selected {
        flex-grow: 1;
        opacity: 1;
        filter: brightness(1);
        transform: skewX(0deg);
    }

    .choice-item.is-sibling {
        min-width: 0;
        flex-grow: 0;
        opacity: 0;
    }
}

.is-child-entering {
    z-index: 2;
    animation: child-enter-from-right $forward-swipe-duration cubic-bezier(0.2, 0.75, 0.2, 1) both;
}

.is-child-exiting {
    z-index: 2;
    animation: child-exit-to-right $back-swipe-duration cubic-bezier(0.4, 0, 0.2, 1) both;
}

.is-branch-collapsing {
    animation: hold-level $back-branch-duration linear both;

    .choice-item.is-selected {
        animation: collapse-selected $back-branch-duration cubic-bezier(0.2, 0.75, 0.2, 1) both;
    }

    .choice-item.is-sibling {
        animation: restore-sibling $back-branch-duration cubic-bezier(0.2, 0.75, 0.2, 1) both;
    }
}

@keyframes hold-level {
    from,
    to {
        visibility: visible;
    }
}

@keyframes expand-selected {
    from {
        flex-grow: 1;
        filter: brightness(0.85);
        transform: skewX(-5deg);
    }
    to {
        flex-grow: 1;
        filter: brightness(1);
        transform: skewX(0deg);
    }
}

@keyframes contract-sibling {
    from {
        min-width: 0;
        flex-grow: 1;
        opacity: 1;
    }
    to {
        min-width: 0;
        flex-grow: 0;
        opacity: 0;
    }
}

@keyframes child-enter-from-right {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}

@keyframes child-exit-to-right {
    from {
        transform: translateX(0);
    }
    to {
        transform: translateX(100%);
    }
}

@keyframes collapse-selected {
    from {
        flex-grow: 1;
        filter: brightness(1);
        transform: skewX(0deg);
    }
    to {
        flex-grow: 1;
        filter: brightness(0.85);
        transform: skewX(-5deg);
    }
}

@keyframes restore-sibling {
    from {
        min-width: 0;
        flex-grow: 0;
        opacity: 0;
    }
    to {
        min-width: 0;
        flex-grow: 1;
        opacity: 1;
    }
}
</style>
