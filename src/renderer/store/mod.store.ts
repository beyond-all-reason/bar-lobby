// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { ModMetadata, ModType, ModInstallOptions } from "@main/content/mods/mod-types";

export const modStore = reactive({
    isInitialized: false,
    installedMods: [] as ModMetadata[],
    selectedMods: [] as string[], // Array of mod IDs
} as {
    isInitialized: boolean;
    installedMods: ModMetadata[];
    selectedMods: string[];
});

export async function initModStore() {
    if (modStore.isInitialized) return;

    try {
        modStore.installedMods = await window.mod.getInstalledMods();
        modStore.isInitialized = true;
    } catch (error) {
        console.error("Failed to initialize mod store:", error);
    }
}

export async function refreshModStore() {
    modStore.installedMods = await window.mod.getInstalledMods();
}

export async function installModFromGitHub(options: ModInstallOptions) {
    try {
        const mod = await window.mod.installFromGitHub(options);
        modStore.installedMods.push(mod);
        return mod;
    } catch (error) {
        console.error("Failed to install mod:", error);
        throw error;
    }
}

export async function uninstallMod(modId: string) {
    try {
        await window.mod.uninstallMod(modId);
        modStore.installedMods = modStore.installedMods.filter((mod) => mod.id !== modId);
        modStore.selectedMods = modStore.selectedMods.filter((id) => id !== modId);
    } catch (error) {
        console.error("Failed to uninstall mod:", error);
        throw error;
    }
}

export async function updateMod(modId: string) {
    try {
        const updatedMod = await window.mod.updateMod(modId);
        const index = modStore.installedMods.findIndex((mod) => mod.id === modId);
        if (index !== -1) {
            modStore.installedMods[index] = updatedMod;
        }
        return updatedMod;
    } catch (error) {
        console.error("Failed to update mod:", error);
        throw error;
    }
}

export function getModsByType(modType: ModType): ModMetadata[] {
    return modStore.installedMods.filter((mod) => mod.modtype === modType);
}

export function getModsByGame(gameShortName: string): ModMetadata[] {
    return modStore.installedMods.filter((mod) => mod.dependencies.some((dep) => dep.type === "rapid" && dep.identifier === gameShortName.toLowerCase()));
}

export function isModSelected(modId: string): boolean {
    return modStore.selectedMods.includes(modId);
}

export function toggleModSelection(modId: string) {
    const index = modStore.selectedMods.indexOf(modId);
    if (index === -1) {
        modStore.selectedMods.push(modId);
    } else {
        modStore.selectedMods.splice(index, 1);
    }
}

export function clearModSelection() {
    modStore.selectedMods = [];
}

export function getSelectedMods(): ModMetadata[] {
    return modStore.installedMods.filter((mod) => modStore.selectedMods.includes(mod.id));
}
