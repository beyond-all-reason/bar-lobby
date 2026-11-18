// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { engineSettingsApi } from "@renderer/api/engine-settings";
import type { TranslationKey } from "@renderer/i18n";
import { fromMain } from "@renderer/logic/from-main";
import {
    CURATED_ENGINE_SETTING_DESCRIPTORS,
    type EngineSettingCategory,
    type EngineSettingDescriptor,
    engineSettingDescriptors,
    type EngineSettingText,
    type EngineSettingValue,
    matchesQuery,
} from "@renderer/logic/engine-settings/descriptors";
import { engineSettingsActions, engineSettingsStore } from "@renderer/store/engine-settings.store";
import type { EngineSettingScope, EngineSettingsFailure, EngineSettingsView } from "@shared/engine-settings/view";

let isInitialized = false;

// Keyed on every reason main can give, so a new one does not compile until it has wording.
const failureKeys: Record<EngineSettingsFailure, TranslationKey> = {
    settings_unusable: "lobby.logic.engineSettings.failures.settingsUnusable",
    invalid_setting: "lobby.logic.engineSettings.failures.invalidSetting",
    settings_failed: "lobby.logic.engineSettings.failures.settingsFailed",
};

// Keeps the store current with every change main makes, including ones a game made. Loading waits until the
// settings are first shown.
export function initEngineSettingsLogic() {
    if (isInitialized) {
        return;
    }
    engineSettingsApi.onChanged((view) => engineSettingsActions.viewLoaded(view));
    isInitialized = true;
}

async function load() {
    const loaded = await fromMain(() => engineSettingsApi.get(), failureKeys, "settings_failed");
    if ("reason" in loaded) {
        engineSettingsActions.loadFailed(loaded.reason);
    } else {
        engineSettingsActions.viewLoaded(loaded.data);
    }
}

export type EffectiveValue = { text: string; from: "override" | "client" | "engine" };

// What the engine will use: the player's override, else the client's default, else the engine's own.
export function effectiveValue(view: EngineSettingsView, key: string): EffectiveValue | undefined {
    if (Object.hasOwn(view.overrides, key)) {
        return { text: view.overrides[key].value, from: "override" };
    }
    if (Object.hasOwn(view.clientDefaults, key)) {
        return { text: view.clientDefaults[key], from: "client" };
    }
    if (Object.hasOwn(view.engineDefaults, key)) {
        return { text: view.engineDefaults[key], from: "engine" };
    }

    return undefined;
}

// The value a descriptor's control shows, or undefined while loading or for a value it can't show.
function value<Descriptor extends EngineSettingDescriptor>(descriptor: Descriptor): EngineSettingValue<Descriptor> | undefined {
    const view = engineSettingsStore.view;
    if (!view) {
        return undefined;
    }
    const effective = effectiveValue(view, descriptor.key);

    return (effective ? descriptor.parse(effective.text) : descriptor.gameDefault) as EngineSettingValue<Descriptor> | undefined;
}

// Every setting to offer, by category, filtered by a search query when there is one. Before the settings load,
// only the curated ones. show turns a label or description into what the player reads, for the search.
function descriptors(category: EngineSettingCategory, query = "", show: (text: EngineSettingText) => string = () => ""): EngineSettingDescriptor[] {
    const view = engineSettingsStore.view;
    const all = view ? engineSettingDescriptors(view.engineVars, view.overrides) : [...CURATED_ENGINE_SETTING_DESCRIPTORS];

    return all.filter((descriptor) => descriptor.category === category && matchesQuery(descriptor, query, show));
}

function isOverridden(key: string): boolean {
    return engineSettingsStore.view !== undefined && Object.hasOwn(engineSettingsStore.view.overrides, key);
}

function scopeOf(key: string): EngineSettingScope | undefined {
    return engineSettingsStore.view?.overrides[key]?.scope;
}

async function change(key: string, call: () => ReturnType<typeof engineSettingsApi.get>) {
    const changed = await fromMain(call, failureKeys, "settings_failed");
    if ("reason" in changed) {
        engineSettingsActions.changeFailed(key, changed.reason);
        return false;
    }
    engineSettingsActions.changed(key, changed.data);
    return true;
}

// For the next launch. A value equal to the default removes the override.
function set<Descriptor extends EngineSettingDescriptor>(descriptor: Descriptor, value: EngineSettingValue<Descriptor>) {
    // Each descriptor formats only its own control's values, which the signature already ties to it.
    const format = descriptor.format as (value: EngineSettingValue<Descriptor>) => string;

    return change(descriptor.key, () => engineSettingsApi.set(descriptor.key, format(value)));
}

function reset(descriptor: EngineSettingDescriptor) {
    return change(descriptor.key, () => engineSettingsApi.reset(descriptor.key));
}

function failureKey(reason: EngineSettingsFailure): TranslationKey {
    return failureKeys[reason];
}

export const engineSettingsLogic = { load, descriptors, value, isOverridden, scopeOf, set, reset, failureKey };
