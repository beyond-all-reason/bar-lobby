<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="nested-choice-panel">
        <template v-if="operation.status === 'idle'">
            <button v-if="path.length && !transition" class="back-button" data-testid="choice-panel-back" type="button" @click="goBack">
                {{ backLabel }}
            </button>
            <div v-if="transition" class="transition-stack choice-level-shell" :data-transition-phase="transition.phase">
                <DiagonalChoiceLevel
                    v-if="transition.phase === 'branch-expanding'"
                    :choices="transition.parentItems"
                    :selected-id="transition.branch.id"
                    transition-role="branch-expanding"
                    :interactive="false"
                    @transition-complete="advanceTransition"
                />
                <template v-else-if="transition.phase === 'child-entering'">
                    <DiagonalChoiceLevel
                        :choices="transition.parentItems"
                        :selected-id="transition.branch.id"
                        transition-role="branch-expanded"
                        :interactive="false"
                    />
                    <DiagonalChoiceLevel
                        :choices="transition.childItems"
                        transition-role="child-entering"
                        :interactive="false"
                        @transition-complete="advanceTransition"
                    />
                </template>
                <template v-else-if="transition.phase === 'child-exiting'">
                    <DiagonalChoiceLevel
                        :choices="transition.parentItems"
                        :selected-id="transition.branch.id"
                        transition-role="branch-expanded"
                        :interactive="false"
                    />
                    <DiagonalChoiceLevel
                        :choices="transition.childItems"
                        transition-role="child-exiting"
                        :interactive="false"
                        @transition-complete="advanceTransition"
                    />
                </template>
                <DiagonalChoiceLevel
                    v-else
                    :choices="transition.parentItems"
                    :selected-id="transition.branch.id"
                    transition-role="branch-collapsing"
                    :interactive="false"
                    @transition-complete="advanceTransition"
                />
            </div>
            <DiagonalChoiceLevel v-else :choices="currentChoices" @selected="selectItem" />
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
import DiagonalChoiceLevel from "@renderer/components/battle/DiagonalChoiceLevel.vue";
import type { ChoicePanelAction, ChoicePanelBranch, ChoicePanelItem } from "@renderer/components/battle/nested-choice-panel.types";
import { computed, onMounted, reactive, ref, watch } from "vue";

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

type TransitionPhase = "branch-expanding" | "child-entering" | "child-exiting" | "branch-collapsing";

type PanelTransition = {
    phase: TransitionPhase;
    branch: ChoicePanelBranch;
    parentItems: ChoicePanelItem[];
    childItems: ChoicePanelItem[];
};

const path = ref<ChoicePanelBranch[]>([]);
const transition = ref<PanelTransition>();
const activeAction = ref<ChoicePanelAction>();
const activeBranch = ref<ChoicePanelBranch>();
const branchPending = ref(false);
const operation = reactive<{ status: "idle" | "pending" | "error"; message?: string }>({ status: "idle" });
const operationGeneration = ref(0);
const pendingBranch = ref<ChoicePanelBranch>();
const reducedMotion = ref(false);

const currentChoices = computed(() => path.value.at(-1)?.children ?? props.choices);
const isLocked = computed(() => Boolean(transition.value) || branchPending.value || operation.status === "pending");

async function selectItem(id: string) {
    if (isLocked.value) return;
    const item = currentChoices.value.find((candidate) => candidate.id === id);
    if (!item) return;

    if (item.type === "branch") {
        activeBranch.value = item;
        branchPending.value = true;
        const generation = operationGeneration.value;
        try {
            await item.beforeEnter?.();
            if (generation !== operationGeneration.value || activeBranch.value?.id !== item.id) return;
            pendingBranch.value = item;
            transition.value = {
                phase: "branch-expanding",
                branch: item,
                parentItems: currentChoices.value,
                childItems: item.children,
            };
            if (reducedMotion.value) completeForwardTransition();
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
        const result = await action.run();
        if (generation !== operationGeneration.value || activeAction.value !== action) return;
        if (result.ok) {
            emit("completed", action.id);
            return;
        }

        operation.status = "error";
        operation.message = result.message;
    } catch (error) {
        if (generation !== operationGeneration.value || activeAction.value !== action) return;
        operation.status = "error";
        operation.message = error instanceof Error ? error.message : String(error);
    }
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
    const branch = path.value.at(-1);
    if (!branch) return;

    if (reducedMotion.value) {
        path.value.pop();
        return;
    }

    transition.value = {
        phase: "child-exiting",
        branch,
        parentItems: path.value.at(-2)?.children ?? props.choices,
        childItems: currentChoices.value,
    };
}

function advanceTransition() {
    const activeTransition = transition.value;
    if (!activeTransition) return;

    switch (activeTransition.phase) {
        case "branch-expanding":
            activeTransition.phase = "child-entering";
            break;
        case "child-entering":
            path.value.push(activeTransition.branch);
            transition.value = undefined;
            break;
        case "child-exiting":
            activeTransition.phase = "branch-collapsing";
            break;
        case "branch-collapsing":
            path.value.pop();
            transition.value = undefined;
            break;
    }
}

function completeForwardTransition() {
    const activeTransition = transition.value;
    if (!activeTransition) return;
    path.value.push(activeTransition.branch);
    pendingBranch.value = undefined;
    transition.value = undefined;
}

function reset() {
    operationGeneration.value += 1;
    pendingBranch.value = undefined;
    activeBranch.value = undefined;
    branchPending.value = false;
    transition.value = undefined;
    path.value = [];
    clearOperation();
}

watch(() => props.resetKey, reset);

onMounted(() => {
    reducedMotion.value = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? true;
});

defineExpose({ reset });
</script>

<style lang="scss" scoped>
.nested-choice-panel {
    position: relative;
    height: 100%;
    overflow: hidden;
}

.transition-stack {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
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
