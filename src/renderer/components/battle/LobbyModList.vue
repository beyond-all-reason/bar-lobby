<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="lobby-mod-list flex-col gap-md">
        <div class="flex-row flex-space-between">
            <h3>Mods</h3>
            <Button v-if="lobbyStore.isBoss" class="blue small" @click="showModSelector = true">
                {{ t("lobby.customLobby.addMod") }}
            </Button>
        </div>

        <div v-if="!lobbyStore.currentLobby" class="no-lobby">No lobby</div>

        <div v-else-if="mods.length === 0" class="no-mods">
            {{ t("lobby.customLobby.noMods") }}
        </div>

        <div v-else class="mods-container flex-col gap-sm">
            <div class="mod-order-notice" v-if="lobbyStore.isBoss">
                <Icon :icon="infoIcon" />
                {{ t("lobby.customLobby.modOrderMatters") }}
            </div>

            <draggable
                v-model="localMods"
                :disabled="!lobbyStore.isBoss"
                @end="onModsReordered"
                item-key="gitRef"
                class="draggable-list flex-col gap-sm"
                handle=".drag-handle"
            >
                <template #item="{ element, index }">
                    <div class="mod-item flex-row gap-md flex-space-between" :class="{ 'is-draggable': lobbyStore.isBoss }">
                        <div class="mod-info flex-row gap-md">
                            <Icon v-if="lobbyStore.isBoss" :icon="dragIcon" class="drag-handle" />
                            <span class="mod-order">{{ index + 1 }}.</span>
                            <div class="flex-col">
                                <span class="mod-name">{{ element.name }}</span>
                                <span class="mod-archive">{{ element.archiveName }}</span>
                            </div>
                        </div>

                        <Button v-if="lobbyStore.isBoss" class="red small" @click="removeMod(index)">
                            <Icon :icon="deleteIcon" />
                        </Button>
                    </div>
                </template>
            </draggable>
        </div>

        <!-- Mod selector modal (placeholder for now) -->
        <Modal v-if="showModSelector" :title="t('lobby.customLobby.selectMod')" @close="showModSelector = false">
            <div class="flex-col gap-md">
                <p>Mod selection coming soon</p>
                <Button class="blue" @click="showModSelector = false"> Close </Button>
            </div>
        </Modal>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { Icon } from "@iconify/vue";
import dragIcon from "@iconify-icons/mdi/drag";
import deleteIcon from "@iconify-icons/mdi/delete";
import infoIcon from "@iconify-icons/mdi/information";
import draggable from "vuedraggable";
import { useTypedI18n } from "@renderer/i18n";

import Button from "@renderer/components/controls/Button.vue";
import Modal from "@renderer/components/common/Modal.vue";
import { lobbyStore, lobbyActions } from "@renderer/store/lobby.store";
import type { Mod } from "tachyon-protocol/types";

const { t } = useTypedI18n();

const showModSelector = ref(false);

// Local copy for drag-and-drop
const localMods = ref<Mod[]>([]);

const mods = computed(() => lobbyStore.currentLobby?.mods || []);

// Sync local mods with store
watch(
    mods,
    (newMods) => {
        localMods.value = [...newMods];
    },
    { immediate: true }
);

async function onModsReordered() {
    if (!lobbyStore.isBoss || !lobbyStore.currentLobby) return;

    try {
        await lobbyActions.updateMods(localMods.value);
    } catch (error) {
        console.error("Failed to reorder mods:", error);
        // Revert to server state on error
        localMods.value = [...mods.value];
    }
}

async function removeMod(index: number) {
    if (!lobbyStore.isBoss || !lobbyStore.currentLobby) return;

    const newMods = [...localMods.value];
    newMods.splice(index, 1);

    try {
        await lobbyActions.updateMods(newMods);
    } catch (error) {
        console.error("Failed to remove mod:", error);
    }
}
</script>

<style lang="scss" scoped>
.lobby-mod-list {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 16px;
}

.no-lobby,
.no-mods {
    text-align: center;
    padding: 32px;
    color: var(--color-text-secondary);
    font-size: 0.9em;
}

.mod-order-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(33, 150, 243, 0.1);
    border-left: 3px solid var(--color-primary);
    font-size: 0.85em;
    color: var(--color-text-secondary);
}

.mods-container {
    max-height: 400px;
    overflow-y: auto;
}

.draggable-list {
    min-height: 50px;
}

.mod-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    align-items: center;
    transition: background 0.2s;

    &.is-draggable {
        cursor: grab;

        &:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        &:active {
            cursor: grabbing;
        }
    }
}

.mod-info {
    align-items: center;
    flex: 1;
}

.drag-handle {
    cursor: grab;
    color: var(--color-text-secondary);

    &:hover {
        color: var(--color-text);
    }

    &:active {
        cursor: grabbing;
    }
}

.mod-order {
    font-weight: 600;
    color: var(--color-primary);
    min-width: 24px;
}

.mod-name {
    font-weight: 500;
}

.mod-archive {
    font-size: 0.8em;
    color: var(--color-text-secondary);
}

.small {
    padding: 4px 8px;
    font-size: 0.85em;
}
</style>
