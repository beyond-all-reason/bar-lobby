// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// The engine settings the client offers, and how each is shown and written. Values travel as
// springsettings.cfg strings; a descriptor turns them into what a control edits and back.

import en from "@renderer/assets/languages/en.json";
import type { TranslationKey } from "@renderer/i18n";
import { isDeviceKey } from "@shared/engine-settings/device-keys";
import { isGameOwnedKey } from "@shared/engine-settings/game-owned-keys";
import type { EngineVarInfo } from "@shared/engine-settings/view";

// The game's own options menu's tabs (gui_options.lua's optionGroups).
export type EngineSettingGroup = "gfx" | "ui" | "game" | "control" | "sound" | "notif" | "accessibility" | "custom" | "dev";

// As the game's options menu shows its own: basic always, advanced once expanded, dev only in dev mode.
export type EngineSettingCategory = "basic" | "advanced" | "dev";

// A translation where there is one, else text as it is, such as a key's own name.
export type EngineSettingText = { key: TranslationKey } | { text: string };

type DescriptorOf<Control extends string, Value> = {
    key: string;
    control: Control;
    label: EngineSettingText;
    description?: EngineSettingText;
    // Only curated entries have one.
    group?: EngineSettingGroup;
    category: EngineSettingCategory;
    // Kept on this machine and never synced.
    deviceOnly: boolean;
    // For a key only the game reads, which the engine has no default for: the value the game falls back to
    // when nothing sets it. Only shown, never written.
    gameDefault?: Value;
    // The value a control shows, or undefined for text it can't show. Not clamped: a value outside the range,
    // such as one set by hand, shows as it is.
    parse(text: string): Value | undefined;
    // What is written for a value.
    format(value: Value): string;
};

// Writes values clamped to the range and snapped to the step, as the game's own slider does.
export type SliderSettingDescriptor = DescriptorOf<"slider", number> & { min: number; max: number; step: number };
// Writes values clamped to whichever limits there are, and whole numbers for an integer.
export type NumberSettingDescriptor = DescriptorOf<"number", number> & { min?: number; max?: number; integer: boolean };
export type CheckboxSettingDescriptor = DescriptorOf<"checkbox", boolean>;
export type TextSettingDescriptor = DescriptorOf<"text", string>;
// One of a fixed list of values, each with its own label.
export type SelectSettingDescriptor = DescriptorOf<"select", string> & { options: readonly { value: string; label: EngineSettingText }[] };

export type EngineSettingDescriptor = SliderSettingDescriptor | NumberSettingDescriptor | CheckboxSettingDescriptor | TextSettingDescriptor | SelectSettingDescriptor;

// What a descriptor's control edits.
export type EngineSettingValue<Descriptor extends EngineSettingDescriptor> = NonNullable<ReturnType<Descriptor["parse"]>>;

type Shown = Pick<EngineSettingDescriptor, "key" | "label" | "description" | "group" | "category">;

function parseNumber(text: string): number | undefined {
    const value = text.trim() === "" ? NaN : Number(text);

    return Number.isFinite(value) ? value : undefined;
}

const decimalsOf = (step: number) => (String(step).split(".")[1] ?? "").length;

function slider(options: Shown & Pick<SliderSettingDescriptor, "min" | "max" | "step" | "gameDefault">): SliderSettingDescriptor {
    const decimals = decimalsOf(options.step);

    return {
        ...options,
        control: "slider",
        deviceOnly: isDeviceKey(options.key),
        parse: parseNumber,
        format(value) {
            const clamped = Math.min(options.max, Math.max(options.min, value));
            const snapped = options.min + Math.round((clamped - options.min) / options.step) * options.step;
            // Through toFixed, so 0.1 steps don't print as 0.30000000000000004, then Number, so 1.00 prints as 1.
            // Clamped again after rounding, which can carry a limit with more decimals than the step past itself.
            return String(Math.min(options.max, Math.max(options.min, Number(snapped.toFixed(decimals)))));
        },
    };
}

function numberBox(options: Shown & Pick<NumberSettingDescriptor, "min" | "max" | "integer">): NumberSettingDescriptor {
    return {
        ...options,
        control: "number",
        deviceOnly: isDeviceKey(options.key),
        parse: parseNumber,
        format(value) {
            const clamped = Math.min(options.max ?? Infinity, Math.max(options.min ?? -Infinity, value));

            return String(options.integer ? Math.round(clamped) : clamped);
        },
    };
}

// The words the engine reads as a bool, besides numbers, where anything but 0 is true.
const TRUE_WORDS = ["true", "yes", "on"];
const FALSE_WORDS = ["false", "no", "off"];

function checkbox(options: Shown & Pick<CheckboxSettingDescriptor, "gameDefault">): CheckboxSettingDescriptor {
    return {
        ...options,
        control: "checkbox",
        deviceOnly: isDeviceKey(options.key),
        parse(text) {
            const word = text.trim().toLowerCase();
            if (TRUE_WORDS.includes(word)) return true;
            if (FALSE_WORDS.includes(word)) return false;
            const number = parseNumber(word);

            return number === undefined ? undefined : number !== 0;
        },
        format: (value) => (value ? "1" : "0"),
    };
}

function textBox(options: Shown): TextSettingDescriptor {
    return { ...options, control: "text", deviceOnly: isDeviceKey(options.key), parse: (text) => text, format: (value) => value.trim() };
}

function select(options: Shown & Pick<SelectSettingDescriptor, "options" | "gameDefault">): SelectSettingDescriptor {
    return {
        ...options,
        control: "select",
        deviceOnly: isDeviceKey(options.key),
        // Compared as numbers too, so a value written by hand as 3.0 still shows as the option written as 3.
        parse(text) {
            const trimmed = text.trim();
            const number = parseNumber(trimmed);

            return options.options.find((option) => option.value === trimmed || (number !== undefined && parseNumber(option.value) === number))?.value;
        },
        format: (value) => value,
    };
}

type EngineStringName = TranslationKey extends infer Key ? (Key extends `lobby.navbar.settings.engine.${infer Name}` ? Name : never) : never;

// A curated entry's label, and its description when it has one, from the lobby.navbar.settings.engine strings.
const texts = (label: EngineStringName, description?: EngineStringName) => ({
    label: { key: `lobby.navbar.settings.engine.${label}` as const },
    ...(description && { description: { key: `lobby.navbar.settings.engine.${description}` as const } }),
});

// The option written as its position in the list, from 0, as the game's own menu writes these.
const listed = (...names: EngineStringName[]) => names.map((name, index) => ({ value: String(index), label: { key: `lobby.navbar.settings.engine.${name}` as const } }));

// The game's own options menu's options that each set one key and nothing else, from gui_options.lua. Ranges, steps,
// groups and categories are the game's, so a value set here is one the game would offer, and they are in the
// game's order. A gameDefault is the game's own fallback, for a key the engine doesn't define.
export const CURATED_ENGINE_SETTING_DESCRIPTORS = [
    // Basic
    select({
        key: "ShadowQuality",
        ...texts("shadowQuality", "shadowQualityDescription"),
        group: "gfx",
        category: "basic",
        options: listed("options.off", "options.lowest", "options.low", "options.medium", "options.high", "options.ultra"),
        gameDefault: "3",
    }),
    slider({ key: "ui_scale", ...texts("uiScale"), group: "ui", category: "basic", min: 0.8, max: 1.3, step: 0.01, gameDefault: 1 }),
    checkbox({ key: "HideSpecChat", ...texts("hideSpecChat", "hideSpecChatDescription"), group: "ui", category: "basic", gameDefault: false }),
    checkbox({ key: "HideSpecChatPlayer", ...texts("hideSpecChatPlayer", "hideSpecChatPlayerDescription"), group: "ui", category: "basic", gameDefault: true }),
    checkbox({ key: "DisplayDPS", ...texts("displayDps", "displayDpsDescription"), group: "ui", category: "basic", gameDefault: false }),
    checkbox({ key: "grabinput", ...texts("containMouse", "containMouseDescription"), group: "control", category: "basic", gameDefault: true }),
    slider({ key: "EdgeMoveWidth", ...texts("edgeScrollWidth", "edgeScrollWidthDescription"), group: "control", category: "basic", min: 0, max: 0.1, step: 0.01 }),
    slider({ key: "MiddleClickScrollSpeed", ...texts("middleClickScrollSpeed", "middleClickScrollSpeedDescription"), group: "control", category: "basic", min: -0.01, max: -0.00195, step: 0.0001 }),
    checkbox({ key: "InvertMouse", ...texts("invertMouse"), group: "control", category: "basic" }),
    slider({ key: "snd_volmaster", ...texts("masterVolume"), group: "sound", category: "basic", min: 0, max: 80, step: 2 }),
    slider({ key: "snd_volgeneral", ...texts("generalVolume"), group: "sound", category: "basic", min: 0, max: 100, step: 2 }),
    slider({ key: "snd_volbattle_options", ...texts("battleVolume"), group: "sound", category: "basic", min: 0, max: 100, step: 2, gameDefault: 100 }),
    slider({ key: "snd_volui", ...texts("interfaceVolume"), group: "sound", category: "basic", min: 0, max: 100, step: 2 }),
    slider({ key: "snd_volmusic", ...texts("musicVolume"), group: "sound", category: "basic", min: 0, max: 99, step: 1 }),
    // Advanced
    checkbox({ key: "LimitIdleFps", ...texts("limitIdleFps", "limitIdleFpsDescription"), group: "gfx", category: "advanced", gameDefault: false }),
    checkbox({ key: "NanoParticleLights", ...texts("nanoParticleLights", "nanoParticleLightsDescription"), group: "gfx", category: "advanced", gameDefault: true }),
    checkbox({ key: "widgetselector", ...texts("widgetSelector", "widgetSelectorDescription"), group: "ui", category: "advanced", gameDefault: false }),
    slider({ key: "DoubleClickTime", ...texts("doubleClickTime", "doubleClickTimeDescription"), group: "control", category: "advanced", min: 150, max: 400, step: 10 }),
    checkbox({ key: "EdgeMoveDynamic", ...texts("edgeScrollDynamic", "edgeScrollDynamicDescription"), group: "control", category: "advanced" }),
    select({
        key: "CamSpringTrackMapHeightMode",
        ...texts("cameraHeight", "cameraHeightDescription"),
        group: "control",
        category: "advanced",
        options: listed("options.constant", "options.terrain", "options.smooth"),
    }),
    select({ key: "CamTransitionMode", ...texts("cameraSmoothing"), group: "control", category: "advanced", options: listed("options.exponentialDecay", "options.springDampened") }),
    checkbox({ key: "CamSpringZoomInToMousePos", ...texts("zoomToCursor"), group: "control", category: "advanced" }),
    checkbox({ key: "CamSpringZoomOutFromMousePos", ...texts("zoomFromCursor"), group: "control", category: "advanced" }),
    checkbox({ key: "snd_unitsound", ...texts("unitSounds"), group: "sound", category: "advanced", gameDefault: true }),
    slider({ key: "snd_airAbsorption", ...texts("airAbsorption", "airAbsorptionDescription"), group: "sound", category: "advanced", min: 0, max: 0.4, step: 0.01 }),
    slider({ key: "snd_zoomVolume", ...texts("zoomFadeout", "zoomFadeoutDescription"), group: "sound", category: "advanced", min: 0, max: 3, step: 0.01, gameDefault: 1 }),
    checkbox({ key: "muteOffscreen", ...texts("muteOffscreen", "muteOffscreenDescription"), group: "sound", category: "advanced", gameDefault: false }),
] as const satisfies readonly EngineSettingDescriptor[];

/** Settings in runs of the same group, in the order given. Ones without a group form runs of their own. */
export function groupRuns(descriptors: readonly EngineSettingDescriptor[]): { group?: EngineSettingGroup; descriptors: EngineSettingDescriptor[] }[] {
    const runs: { group?: EngineSettingGroup; descriptors: EngineSettingDescriptor[] }[] = [];
    for (const descriptor of descriptors) {
        const last = runs.at(-1);
        if (last && last.group === descriptor.group) {
            last.descriptors.push(descriptor);
        } else {
            runs.push({ group: descriptor.group, descriptors: [descriptor] });
        }
    }

    return runs;
}

// TODO: these are the engine's own English descriptions, imported by tools/import-engine-setting-descriptions.ts.
// They are translation strings so they can be translated like the rest of the client, but none have been yet,
// so every locale shows the English.
const descriptionKeys = en.lobby.navbar.settings.engine.descriptions;

function engineDescription(key: string, info: EngineVarInfo): EngineSettingText | undefined {
    if (Object.hasOwn(descriptionKeys, key)) {
        return { key: `lobby.navbar.settings.engine.descriptions.${key}` as TranslationKey };
    }

    return info.description ? { text: info.description } : undefined;
}

// Engine variables without a step of their own move by this much on a slider.
const FLOAT_STEP = 0.01;

function fromEngineVar(key: string, info: EngineVarInfo): EngineSettingDescriptor {
    const shown: Shown = { key, label: { text: key }, description: engineDescription(key, info), category: "dev" };
    const integer = info.type === "int" || info.type === "unsigned";
    if (info.type === "bool") {
        return checkbox(shown);
    }
    if (!integer && info.type !== "float") {
        return textBox(shown);
    }
    if (info.min !== undefined && info.max !== undefined) {
        return slider({ ...shown, min: info.min, max: info.max, step: integer ? 1 : FLOAT_STEP });
    }

    return numberBox({ ...shown, min: info.min, max: info.max, integer });
}

const byKey = (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key, "en", { sensitivity: "base" });

/**
 * Every setting to offer: the curated ones, then the engine's variables and any other key with an override,
 * such as one only the game reads, by key. Read-only variables are left out, and deprecated ones too unless
 * overridden, so an override can still be reset.
 */
export function engineSettingDescriptors(engineVars: Record<string, EngineVarInfo>, overrides: Record<string, unknown>): EngineSettingDescriptor[] {
    const curated = new Set<string>(CURATED_ENGINE_SETTING_DESCRIPTORS.map((descriptor) => descriptor.key));
    const generated = Object.entries(engineVars)
        .filter(([key, info]) => !curated.has(key) && !isGameOwnedKey(key) && !info.readOnly && (!info.deprecated || Object.hasOwn(overrides, key)))
        .map(([key, info]) => fromEngineVar(key, info));
    const unrecognised = Object.keys(overrides)
        .filter((key) => !curated.has(key) && !Object.hasOwn(engineVars, key))
        .map((key) => textBox({ key, label: { text: key }, category: "dev" }));

    return [...CURATED_ENGINE_SETTING_DESCRIPTORS, ...[...generated, ...unrecognised].sort(byKey)];
}

/**
 * Whether a descriptor's key, label or description holds every word of a query, ignoring case. The caller
 * turns each text into what is shown, so a translated label is searched as the player reads it.
 */
export function matchesQuery(descriptor: EngineSettingDescriptor, query: string, show: (text: EngineSettingText) => string): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return true;
    }
    const haystack = [descriptor.key, show(descriptor.label), descriptor.description ? show(descriptor.description) : ""].join("\n").toLowerCase();

    return words.every((word) => haystack.includes(word));
}
