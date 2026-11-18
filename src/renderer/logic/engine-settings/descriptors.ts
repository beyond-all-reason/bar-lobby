// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// The engine settings the client offers, and how each is shown and written. Values travel as
// springsettings.cfg strings; a descriptor turns them into what a control edits and back.

import type { TranslationKey } from "@renderer/i18n";

export type EngineSettingCategory = "sound" | "interface";

export type SliderSettingDescriptor = {
    key: string;
    control: "slider";
    labelKey: TranslationKey;
    category: EngineSettingCategory;
    min: number;
    max: number;
    step: number;
    // For a key only the game reads, which the engine has no default for: the value the game falls back to
    // when nothing sets it. Only shown, never written.
    gameDefault?: number;
    // The value a control shows, or undefined for text that isn't a number. Not clamped: a value outside the
    // range, such as one set by hand, shows as it is.
    parse(text: string): number | undefined;
    // What is written for a value: clamped to the range and snapped to the step, as the game's own slider does.
    format(value: number): string;
};

export type EngineSettingDescriptor = SliderSettingDescriptor;

const decimalsOf = (step: number) => (String(step).split(".")[1] ?? "").length;

function slider(options: Omit<SliderSettingDescriptor, "control" | "parse" | "format">): SliderSettingDescriptor {
    const decimals = decimalsOf(options.step);

    return {
        ...options,
        control: "slider",
        parse(text) {
            const value = text.trim() === "" ? NaN : Number(text);
            return Number.isFinite(value) ? value : undefined;
        },
        format(value) {
            const clamped = Math.min(options.max, Math.max(options.min, value));
            const snapped = options.min + Math.round((clamped - options.min) / options.step) * options.step;
            // Through toFixed, so 0.1 steps don't print as 0.30000000000000004, then Number, so 1.00 prints as 1.
            return String(Number(Math.min(options.max, snapped).toFixed(decimals)));
        },
    };
}

// Ranges and steps are the game's own options menu's, so a value set here is one the game would offer.
export const ENGINE_SETTING_DESCRIPTORS: readonly EngineSettingDescriptor[] = [
    slider({ key: "snd_volmaster", labelKey: "lobby.navbar.settings.engine.masterVolume", category: "sound", min: 0, max: 80, step: 2 }),
    slider({ key: "snd_volmusic", labelKey: "lobby.navbar.settings.engine.musicVolume", category: "sound", min: 0, max: 99, step: 1 }),
    slider({ key: "ui_scale", labelKey: "lobby.navbar.settings.engine.uiScale", category: "interface", min: 0.8, max: 1.3, step: 0.01, gameDefault: 1 }),
];
