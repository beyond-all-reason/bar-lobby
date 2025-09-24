// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, computed, type Ref } from "vue";
import { ModMetadata } from "@main/content/mods/mod-types";
import { enginesStore } from "@renderer/store/engine.store";

export interface ModSelectionState {
    installedMods: Ref<ModMetadata[]>;
    selectedModIds: Ref<string[]>;
    githubRepoInput: Ref<string>;
    installingMod: Ref<boolean>;
}

export interface ModSelectionActions {
    loadInstalledMods: () => Promise<void>;
    installModFromInput: () => Promise<void>;
    uninstallMod: (modId: string) => Promise<void>;
    toggleModSelection: (modId: string) => void;
    clearSelection: () => void;
    selectAll: () => void;
}

export interface ModSelectionComputed {
    selectedMods: Ref<ModMetadata[]>;
    isModSelected: (modId: string) => boolean;
    hasSelectedMods: Ref<boolean>;
    hasInstalledMods: Ref<boolean>;
}

export interface UseModSelectionReturn extends ModSelectionState, ModSelectionActions, ModSelectionComputed {}

/**
 * Composable for managing mod selection state and actions.
 * Provides a clean, reusable interface for mod selection functionality.
 */
export function useModSelection(): UseModSelectionReturn {
    // State
    const installedMods = ref<ModMetadata[]>([]);
    const selectedModIds = ref<string[]>([]);
    const githubRepoInput = ref("");
    const installingMod = ref(false);

    // Computed properties
    const selectedMods = computed(() => {
        return installedMods.value.filter((mod) => selectedModIds.value.includes(mod.id));
    });

    const hasSelectedMods = computed(() => selectedModIds.value.length > 0);
    const hasInstalledMods = computed(() => installedMods.value.length > 0);

    // Actions
    async function loadInstalledMods(): Promise<void> {
        try {
            installedMods.value = await window.mod.getInstalledMods();
        } catch (error) {
            console.error("Failed to load installed mods:", error);
            throw error;
        }
    }

    async function installModFromInput(): Promise<void> {
        if (!githubRepoInput.value.trim()) return;

        installingMod.value = true;
        try {
            // Get the correct mod paths from the main process
            const modPaths = await window.mod.getModPaths();
            const repoName = githubRepoInput.value.split("/").pop() || "mod";
            const targetPath = `${modPaths[0]}/${repoName}-scenario.sdd`;

            const mod = await window.mod.installFromGitHub({
                repository: githubRepoInput.value,
                branch: "main",
                targetPath: targetPath,
                overwrite: true,
                engineVersion: enginesStore.selectedEngineVersion?.id,
            });

            // Clear input and reload mods
            githubRepoInput.value = "";
            await loadInstalledMods();

            console.log(`Successfully installed mod: ${mod.name} ${mod.version}`);
        } catch (error) {
            console.error("Failed to install mod:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to install mod: ${errorMessage}`);
        } finally {
            installingMod.value = false;
        }
    }

    async function uninstallMod(modId: string): Promise<void> {
        try {
            await window.mod.uninstallMod(modId);
            await loadInstalledMods();

            // Remove from selection if it was selected
            const index = selectedModIds.value.indexOf(modId);
            if (index > -1) {
                selectedModIds.value.splice(index, 1);
            }

            console.log(`Successfully uninstalled mod: ${modId}`);
        } catch (error) {
            console.error("Failed to uninstall mod:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to uninstall mod: ${errorMessage}`);
        }
    }

    function toggleModSelection(modId: string): void {
        const index = selectedModIds.value.indexOf(modId);
        if (index > -1) {
            selectedModIds.value.splice(index, 1);
        } else {
            selectedModIds.value.push(modId);
        }
    }

    function clearSelection(): void {
        selectedModIds.value = [];
    }

    function selectAll(): void {
        selectedModIds.value = installedMods.value.map((mod) => mod.id);
    }

    function isModSelected(modId: string): boolean {
        return selectedModIds.value.includes(modId);
    }

    return {
        // State
        installedMods,
        selectedModIds,
        githubRepoInput,
        installingMod,

        // Computed
        selectedMods,
        hasSelectedMods,
        hasInstalledMods,
        isModSelected,

        // Actions
        loadInstalledMods,
        installModFromInput,
        uninstallMod,
        toggleModSelection,
        clearSelection,
        selectAll,
    };
}
