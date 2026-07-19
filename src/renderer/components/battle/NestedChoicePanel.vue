<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="nested-choice-panel" :class="{ 'is-transitioning': transitionLocked }">
        <template v-if="operation.status === 'idle'">
            <button
                v-if="path.length"
                class="back-button"
                data-testid="choice-panel-back"
                type="button"
                :disabled="isLocked"
                @click="goBack"
            >
                {{ backLabel }}
            </button>
            <div
                class="choice-level-shell"
                :class="`transition-${transitionPhase}`"
                :data-transition-phase="transitionPhase"
                @animationend="completeTransition"
            >
                <DiagonalChoiceLevel :choices="currentChoices" :selected-id="selectedId" @selected="selectItem" />
            </div>
        </template>
        <div v-else class="operation-status">
            <p v-if="operation.status === 'pending'" data-testid="choice-panel-pending">{{ pendingLabel }}</p>
            <template v-else>
                <p>{{ failureLabel }}</p>
                <p data-testid="choice-panel-error">{{ operation.message }}</p>
                <button data-testid="choice-panel-retry" type="button" @click="retryOperation">{{ retryLabel }}</button>
                <button data-testid="choice-panel-back-error" type="button" @click="clearOperation">{{ backLabel }}</button>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import DiagonalChoiceLevel from "@renderer/components/battle/DiagonalChoiceLevel.vue";
import type {
    ChoiceActionResult,
    ChoicePanelAction,
    ChoicePanelBranch,
    ChoicePanelItem,
} from "@renderer/components/battle/nested-choice-panel.types";

const props = withDefaults(
    defineProps<{
        choices: ChoicePanelItem[];
        backLabel: string;
        pendingLabel?: string;
        failureLabel?: string;
        retryLabel?: string;
        resetKey?: number;
    }>(),
    {
        pendingLabel: "Preparing…",
        failureLabel: "The selection could not be prepared.",
        retryLabel: "Retry",
        resetKey: 0,
    }
);

const emit = defineEmits<{
    completed: [id: string];
}>();

const path = ref<ChoicePanelBranch[]>([]);
const activeAction = ref<ChoicePanelAction>();
const activeBranch = ref<ChoicePanelBranch>();
const branchPending = ref(false);
const operation = reactive<{ status: "idle" | "pending" | "error"; message?: string }>({ status: "idle" });
const operationGeneration = ref(0);
const transitionPhase = ref<"idle" | "forward" | "back">("idle");
const transitionLocked = ref(false);
const selectedId = ref<string>();
const pendingBranch = ref<ChoicePanelBranch>();
const reducedMotion = ref(false);

const currentItems = computed<ChoicePanelItem[]>(() => path.value.at(-1)?.children ?? props.choices);
const isLocked = computed(() => transitionLocked.value || branchPending.value || operation.status === "pending");
const currentChoices = computed(() => currentItems.value.map((item) => ({ ...item, disabled: isLocked.value })));

async function selectItem(id: string) {
    if (isLocked.value) return;
    const item = currentItems.value.find((candidate) => candidate.id === id);
    if (!item) return;

    if (item.type === "branch") {
        activeBranch.value = item;
        branchPending.value = true;
        try {
            await item.beforeEnter?.();
            if (activeBranch.value?.id === item.id) {
                selectedId.value = item.id;
                pendingBranch.value = item;
                beginTransition("forward");
            }
        } catch (error) {
            operation.status = "error";
            operation.message = error instanceof Error ? error.message : String(error);
        } finally {
            branchPending.value = false;
        }
        return;
    }

    activeAction.value = item;
    await runActiveAction();
}

async function runActiveAction() {
    const action = activeAction.value;
    if (!action || operation.status === "pending") return;

    const generation = operationGeneration.value;
    operation.status = "pending";
    operation.message = undefined;
    try {
        const result: ChoiceActionResult = await action.run();
        if (generation !== operationGeneration.value || activeAction.value !== action) return;
        if (result.ok) {
            emit("completed", action.id);
        } else {
            operation.status = "error";
            operation.message = result.message;
        }
    } catch (error) {
        if (generation !== operationGeneration.value || activeAction.value !== action) return;
        operation.status = "error";
        operation.message = error instanceof Error ? error.message : String(error);
    }
}

function beginTransition(phase: "forward" | "back") {
    transitionPhase.value = phase;
    if (reducedMotion.value) {
        if (phase === "forward" && pendingBranch.value) {
            path.value.push(pendingBranch.value);
            pendingBranch.value = undefined;
        }
        transitionLocked.value = false;
        transitionPhase.value = "idle";
        return;
    }
    transitionLocked.value = true;
}

function completeTransition(event: AnimationEvent) {
    if (event.target !== event.currentTarget) return;
    if (transitionPhase.value === "forward" && pendingBranch.value) {
        path.value.push(pendingBranch.value);
        pendingBranch.value = undefined;
    }
    transitionLocked.value = false;
    transitionPhase.value = "idle";
    selectedId.value = undefined;
}

async function retryOperation() {
    if (activeBranch.value) {
        const branch = activeBranch.value;
        operation.status = "idle";
        operation.message = undefined;
        await selectItem(branch.id);
        return;
    }
    await runActiveAction();
}

function clearOperation() {
    activeAction.value = undefined;
    activeBranch.value = undefined;
    operation.status = "idle";
    operation.message = undefined;
}

function goBack() {
    if (isLocked.value) return;
    if (path.value.length) {
        beginTransition("back");
        path.value.pop();
    }
}

function reset() {
    operationGeneration.value += 1;
    pendingBranch.value = undefined;
    transitionLocked.value = false;
    transitionPhase.value = "idle";
    path.value = [];
    branchPending.value = false;
    clearOperation();
}

onMounted(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedMotion.value = !mediaQuery || mediaQuery.matches;
});

watch(() => props.resetKey, reset);
defineExpose({ reset });
</script>

<style lang="scss" scoped>
.nested-choice-panel {
    position: relative;
    height: 100%;
    overflow: hidden;
}

.back-button {
    position: absolute;
    top: 20px;
    left: 24px;
    z-index: 3;
    border: 0;
    padding: 12px 18px;
    color: white;
    background: rgba(0, 0, 0, 0.65);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    text-transform: uppercase;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }
}

.choice-level-shell {
    height: 100%;

    &.transition-forward {
        animation: choice-level-forward 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    &.transition-back {
        animation: choice-level-back 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
}

@keyframes choice-level-forward {
    from {
        opacity: 0.35;
        transform: translateX(18%) scale(0.94);
    }
    to {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

@keyframes choice-level-back {
    from {
        opacity: 0.35;
        transform: translateX(-18%) scale(0.94);
    }
    to {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .choice-level-shell {
        animation: none !important;
    }
}
.operation-status {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: white;
    text-align: center;
    background: rgba(19, 40, 49, 0.94);

    p {
        max-width: 38rem;
        margin: 0;
        font-size: 1.3rem;
    }

    button {
        border: 0;
        padding: 12px 18px;
        color: white;
        background: rgba(0, 0, 0, 0.65);
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        text-transform: uppercase;
    }
}
</style>
