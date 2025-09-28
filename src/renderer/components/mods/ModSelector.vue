<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mod-selector" :class="variant">
        <div class="mod-selector-header" v-if="showHeader">
            <h5>{{ title }}</h5>
        </div>

        <div class="mod-selector-content">
            <!-- Installation section -->
            <div v-if="showInstallation" class="mod-installation">
                <div class="mod-input-row">
                    <input
                        v-model="modSelection.githubRepoInput.value"
                        type="text"
                        :placeholder="installPlaceholder"
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
            </div>

            <!-- Installed mods list -->
            <div v-if="modSelection.hasInstalledMods.value" class="installed-mods">
                <div
                    v-for="mod in modSelection.installedMods.value"
                    :key="mod.id"
                    class="installed-mod-item"
                    :class="{ selected: modSelection.isModSelected(mod.id) }"
                >
                    <div class="mod-info">
                        <div v-if="modSelection.isModSelected(mod.id)" class="selected-indicator">
                            <Icon :icon="check" width="16" height="16" class="checkmark-icon" />
                        </div>
                        <input
                            v-if="selectionMode === 'checkbox'"
                            type="checkbox"
                            :id="`mod-${mod.id}`"
                            :checked="modSelection.isModSelected(mod.id)"
                            @change="modSelection.toggleModSelection(mod.id)"
                            class="mod-checkbox"
                        />
                        <Select
                            v-else-if="selectionMode === 'dropdown'"
                            :modelValue="modSelection.isModSelected(mod.id) ? mod.id : null"
                            :options="[
                                { label: 'Not Selected', value: null },
                                { label: 'Selected', value: mod.id },
                            ]"
                            @update:modelValue="(value) => handleDropdownSelection(mod.id, value)"
                            class="mod-dropdown"
                        />
                        <label :for="`mod-${mod.id}`" class="mod-label">
                            <span class="mod-name">{{ mod.name }}</span>
                            <span class="mod-version">{{ mod.version }}</span>
                        </label>
                        <div class="mod-actions">
                            <button @click="handleOpenModFolder(mod.installPath)" class="mod-action-button" title="Open mod folder">
                                <Icon :icon="folderIcon" width="16" height="16" />
                            </button>
                            <button
                                @click="handleOpenModRepository(mod.repository)"
                                class="mod-action-button"
                                title="Open repository in browser"
                            >
                                <Icon :icon="externalLinkIcon" width="16" height="16" />
                            </button>
                        </div>
                    </div>
                    <Button v-if="showUninstall" size="small" variant="danger" @click="handleUninstallMod(mod.id)" class="remove-button">
                        <Icon :icon="deleteIcon" width="14" height="14" />
                    </Button>
                </div>
            </div>

            <!-- No mods message -->
            <div v-else-if="showNoModsMessage" class="no-mods">
                <p>{{ noModsMessage }}</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { Icon } from "@iconify/vue";
import check from "@iconify-icons/mdi/check";
import deleteIcon from "@iconify-icons/mdi/delete";
import folderIcon from "@iconify-icons/mdi/folder";
import externalLinkIcon from "@iconify-icons/mdi/open-in-new";
import { type UseModSelectionReturn } from "@renderer/composables/useModSelection";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";

// Define props to configure the component behavior
interface Props {
    modSelection: UseModSelectionReturn;
    title?: string;
    variant?: "default" | "compact" | "minimal";
    selectionMode?: "checkbox" | "dropdown";
    showHeader?: boolean;
    showInstallation?: boolean;
    showUninstall?: boolean;
    showNoModsMessage?: boolean;
    showSelectedSummary?: boolean;
    installPlaceholder?: string;
    noModsMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: "Mod Selection",
    variant: "default",
    selectionMode: "checkbox",
    showHeader: true,
    showInstallation: true,
    showUninstall: true,
    showNoModsMessage: true,
    showSelectedSummary: true,
    installPlaceholder: "Add GitHub repo (e.g., tetrisface/modtest3)",
    noModsMessage: "No mods installed. Enter a GitHub repository to install a mod.",
});

// Use the passed mod selection composable instance
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

function handleDropdownSelection(modId: string, value: string | null) {
    if (value === modId) {
        modSelection.toggleModSelection(modId);
    } else if (modSelection.isModSelected(modId)) {
        modSelection.toggleModSelection(modId);
    }
}

async function handleOpenModFolder(modPath: string) {
    try {
        await window.shell.openModFolder(modPath);
    } catch (error) {
        console.error("Failed to open mod folder:", error);
        alert("Failed to open mod folder");
    }
}

async function handleOpenModRepository(repository: string) {
    try {
        await window.shell.openModRepository(repository);
    } catch (error) {
        console.error("Failed to open mod repository:", error);
        alert("Failed to open mod repository");
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
.mod-selector {
    &.default {
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
    }

    &.compact {
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }

    &.minimal {
        // No padding, border, or background for minimal variant
        padding: 0;
        border: none;
        background: none;
    }

    h4 {
        margin: 0 0 1rem 0;
        color: #ffffff;
        font-weight: 600;
    }

    h5 {
        margin: 0;
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 500;
    }
}

.mod-selector-header {
    margin-bottom: 0.75rem;

    h4,
    h5 {
        margin: 0;
    }
}

.mod-selector-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.mod-installation {
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
            border-color: #4a9eff;
            background-color: rgba(255, 255, 255, 0.15);
        }
    }
}

.installed-mods {
    .installed-mod-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin-bottom: 0.5rem;
        transition: all 0.2s ease;

        &.selected {
            background-color: rgba(74, 158, 255, 0.1);
            border-color: rgba(74, 158, 255, 0.3);
        }

        .mod-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;

            .mod-checkbox {
                margin: 0;
            }

            .mod-dropdown {
                min-width: 120px;
            }

            .mod-label {
                display: flex;
                flex-direction: column;
                cursor: pointer;
                color: #ffffff;
                font-size: 0.875rem;
                flex: 1;

                .mod-name {
                    font-weight: 500;
                }

                .mod-version {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.75rem;
                }
            }

            .mod-actions {
                display: flex;
                gap: 0.25rem;
                margin-left: auto;
            }

            .mod-action-button {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;

                &:hover {
                    color: #ffffff;
                    background-color: rgba(255, 255, 255, 0.1);
                }

                &:active {
                    background-color: rgba(255, 255, 255, 0.2);
                }
            }

            .selected-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 0.5rem;

                .checkmark-icon {
                    color: #4a9eff;
                }
            }
        }

        .remove-button {
            padding: 0.25rem;
            min-width: auto;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;

            svg {
                width: 14px;
                height: 14px;
            }
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
</style>
