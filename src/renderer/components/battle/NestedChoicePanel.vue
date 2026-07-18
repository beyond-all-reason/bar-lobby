<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="nested-choice-panel">
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
            <DiagonalChoiceLevel :choices="currentChoices" @selected="selectItem" />
        </template>
        <div v-else class="operation-status">
            <p v-if="operation.status === 'pending'" data-testid="choice-panel-pending">{{ pendingLabel }}</p>
            <template v-else>
                <p>{{ failureLabel }}</p>
                <p data-testid="choice-panel-error">{{ operation.message }}</p>
                <button data-testid="choice-panel-retry" type="button" @click="runActiveAction">{{ retryLabel }}</button>
                <button data-testid="choice-panel-back-error" type="button" @click="clearOperation">{{ backLabel }}</button>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
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
const branchPending = ref(false);
const operation = reactive<{ status: "idle" | "pending" | "error"; message?: string }>({ status: "idle" });

const currentItems = computed<ChoicePanelItem[]>(() => path.value.at(-1)?.children ?? props.choices);
const isLocked = computed(() => branchPending.value || operation.status === "pending");
const currentChoices = computed(() => currentItems.value.map((item) => ({ ...item, disabled: isLocked.value })));

async function selectItem(id: string) {
    if (isLocked.value) return;
    const item = currentItems.value.find((candidate) => candidate.id === id);
    if (!item) return;

    if (item.type === "branch") {
        branchPending.value = true;
        try {
            await item.beforeEnter?.();
            path.value.push(item);
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

    operation.status = "pending";
    operation.message = undefined;
    try {
        const result: ChoiceActionResult = await action.run();
        if (result.ok) {
            emit("completed", action.id);
        } else {
            operation.status = "error";
            operation.message = result.message;
        }
    } catch (error) {
        operation.status = "error";
        operation.message = error instanceof Error ? error.message : String(error);
    }
}

function clearOperation() {
    activeAction.value = undefined;
    operation.status = "idle";
    operation.message = undefined;
}

function goBack() {
    if (isLocked.value) return;
    path.value.pop();
}

function reset() {
    path.value = [];
    branchPending.value = false;
    clearOperation();
}

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
