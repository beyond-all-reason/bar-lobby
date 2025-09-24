<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mod-selection">
        <div class="mod-selection-header">
            <h4>Mod Selection</h4>
            <div class="mod-selection-actions" v-if="modSelection.hasInstalledMods.value">
                <Button
                    size="small"
                    variant="secondary"
                    @click="modSelection.selectAll"
                    :disabled="modSelection.selectedMods.value.length === modSelection.installedMods.value.length"
                >
                    Select All
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    @click="modSelection.clearSelection"
                    :disabled="!modSelection.hasSelectedMods.value"
                >
                    Clear Selection
                </Button>
            </div>
        </div>

        <div class="mod-input-section">
            <div class="mod-input-row">
                <input
                    v-model="modSelection.githubRepoInput.value"
                    type="text"
                    placeholder="Enter GitHub repo (e.g., tetrisface/modtest3)"
                    class="mod-input"
                    @keyup.enter="handleInstallMod"
                />
                <Button
                    @click="handleInstallMod"
                    :loading="modSelection.installingMod.value"
                    :disabled="!modSelection.githubRepoInput.value.trim()"
                    size="small"
                >
                    Install
                </Button>
            </div>

            <div v-if="modSelection.hasInstalledMods.value" class="installed-mods">
                <h5>Installed Mods:</h5>
                <div v-for="mod in modSelection.installedMods.value" :key="mod.id" class="installed-mod-item">
                    <div class="mod-info">
                        <input
                            type="checkbox"
                            :id="`mod-${mod.id}`"
                            :checked="modSelection.isModSelected(mod.id)"
                            @change="modSelection.toggleModSelection(mod.id)"
                            class="mod-checkbox"
                        />
                        <label :for="`mod-${mod.id}`" class="mod-label">
                            <span class="mod-name">{{ mod.name }}</span>
                            <span class="mod-version">{{ mod.version }}</span>
                        </label>
                    </div>
                    <Button size="small" variant="danger" @click="handleUninstallMod(mod.id)">Remove</Button>
                </div>
            </div>

            <div v-else class="no-mods">
                <p>No mods installed. Enter a GitHub repository to install a mod.</p>
            </div>

            <div v-if="modSelection.hasSelectedMods.value" class="selected-mods">
                <h5>Selected for Launch:</h5>
                <div v-for="mod in modSelection.selectedMods.value" :key="mod.id" class="selected-mod-item">
                    <span>{{ mod.name }} {{ mod.version }}</span>
                    <Button size="small" variant="secondary" @click="modSelection.toggleModSelection(mod.id)">Deselect</Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { type UseModSelectionReturn } from "@renderer/composables/useModSelection";
import Button from "@renderer/components/controls/Button.vue";

// Define props to receive the mod selection composable instance
interface Props {
    modSelection: UseModSelectionReturn;
}

const props = defineProps<Props>();

// Use the passed mod selection composable instance
// Don't destructure reactive refs to maintain reactivity
const modSelection = props.modSelection;

// Event handlers with error handling
async function handleInstallMod() {
    try {
        await modSelection.installModFromInput();
    } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
    }
}

async function handleUninstallMod(modId: string) {
    if (confirm("Are you sure you want to uninstall this mod?")) {
        try {
            await modSelection.uninstallMod(modId);
        } catch (error) {
            alert(error instanceof Error ? error.message : String(error));
        }
    }
}

// Load mods when component mounts
onMounted(async () => {
    try {
        await modSelection.loadInstalledMods();
    } catch (error) {
        console.error("Failed to load mods on mount:", error);
    }
});
</script>

<style lang="scss" scoped>
.mod-selection {
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;

    h4 {
        margin: 0 0 1rem 0;
        color: #ffcc00;
    }
}

.mod-selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h4 {
        margin: 0;
    }
}

.mod-selection-actions {
    display: flex;
    gap: 0.5rem;
}

.mod-input-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.mod-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.mod-input {
    flex: 1;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #ffffff;
    font-size: 0.875rem;

    &::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }

    &:focus {
        outline: none;
        border-color: #ffcc00;
        background-color: rgba(255, 255, 255, 0.15);
    }
}

.installed-mods {
    h5 {
        margin: 0 0 0.5rem 0;
        color: #ffcc00;
        font-size: 0.875rem;
    }
}

.installed-mod-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    margin-bottom: 0.5rem;

    .mod-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }

    .mod-checkbox {
        margin: 0;
    }

    .mod-label {
        display: flex;
        flex-direction: column;
        cursor: pointer;
        color: #ffffff;
        font-size: 0.875rem;

        .mod-name {
            font-weight: 500;
        }

        .mod-version {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.75rem;
        }
    }
}

.no-mods {
    p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
        font-size: 0.875rem;
    }
}

.selected-mods {
    h5 {
        margin: 0 0 0.5rem 0;
        color: #00ff88;
        font-size: 0.875rem;
    }
}

.selected-mod-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    margin-bottom: 0.5rem;

    span {
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 500;
    }
}
</style>
