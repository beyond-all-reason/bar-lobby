<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mod-selection-container">
        <div class="mod-selection-header">
            <h3>{{ t("lobby.ui.components.battle.modSelectionComponent.title") }}</h3>
            <Button @click="openModManager">
                {{ t("lobby.ui.components.battle.modsManagement.manageMods") }}
            </Button>
        </div>

        <div class="mod-list" v-if="availableMods.length > 0">
            <div
                v-for="mod in availableMods"
                :key="mod.id"
                class="mod-item"
                :class="{ selected: isModSelected(mod.id) }"
                @click="toggleModSelection(mod.id)"
            >
                <div class="mod-info">
                    <div class="mod-name">{{ mod.name }}</div>
                    <div class="mod-version">{{ mod.version }}</div>
                    <div class="mod-description">{{ mod.description }}</div>
                </div>
                <div class="mod-actions">
                    <input type="checkbox" :checked="isModSelected(mod.id)" @change="toggleModSelection(mod.id)" class="mod-checkbox" />
                </div>
            </div>
        </div>

        <div v-else class="no-mods">
            <p>{{ t("lobby.ui.components.modManager.noModsAvailable") }}</p>
            <Button @click="openModManager">
                {{ t("lobby.ui.components.modManager.installMods") }}
            </Button>
        </div>

        <div v-if="selectedMods.length > 0" class="selected-mods">
            <h4>Selected Mods</h4>
            <div class="selected-mod-list">
                <div v-for="mod in selectedMods" :key="mod.id" class="selected-mod-item">
                    <span>{{ mod.name }} {{ mod.version }}</span>
                    <Button size="small" variant="danger" @click="toggleModSelection(mod.id)"> Remove </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";
import { modStore, initModStore, getModsByGame, isModSelected, toggleModSelection, getSelectedMods } from "@renderer/store/mod.store";
import { gameStore } from "@renderer/store/game.store";
import Button from "@renderer/components/controls/Button.vue";

const { t } = useTypedI18n();
const router = useRouter();

const availableMods = computed(() => {
    if (!gameStore.selectedGameVersion) return [];
    return getModsByGame("bar"); // Assuming BAR is the game short name
});

const selectedMods = computed(() => getSelectedMods());

function openModManager() {
    router.push("/debug/mod-tester");
}

onMounted(async () => {
    await initModStore();
});
</script>

<style lang="scss" scoped>
.mod-selection-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
}

.mod-selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
        margin: 0;
        color: #ffcc00;
    }
}

.mod-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
}

.mod-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
    }

    &.selected {
        background-color: rgba(255, 204, 0, 0.1);
        border-color: #ffcc00;
    }
}

.mod-info {
    flex: 1;

    .mod-name {
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 0.25rem;
    }

    .mod-version {
        font-size: 0.875rem;
        color: #ffcc00;
        margin-bottom: 0.25rem;
    }

    .mod-description {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
    }
}

.mod-actions {
    margin-left: 1rem;
}

.mod-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.no-mods {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.7);

    p {
        margin-bottom: 1rem;
    }
}

.selected-mods {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 1rem;

    h4 {
        margin: 0 0 0.5rem 0;
        color: #ffcc00;
        font-size: 1rem;
    }
}

.selected-mod-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.selected-mod-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: rgba(255, 204, 0, 0.1);
    border: 1px solid rgba(255, 204, 0, 0.3);
    border-radius: 4px;

    span {
        color: #ffffff;
        font-weight: 500;
    }
}
</style>
