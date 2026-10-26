// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Settings } from "@main/services/settings.service";

let windowStateChanged: (state: { maximized: boolean; size: { width: number; height: number } | null }) => void = () => {};

const getSettings = vi.fn(async () => ({ fullscreen: false, maximized: false, windowWidth: 1280, windowHeight: 720, displayIndex: 0, uiScale: null }) as unknown as Settings);
const updateSettings = vi.fn(async () => ({}));
const setDisplay = vi.fn(async () => {});
const onWindowStateChanged = vi.fn((handler: typeof windowStateChanged) => {
    windowStateChanged = handler;

    return () => {};
});

vi.stubGlobal(
    "window",
    Object.assign(window, {
        settings: { getSettings, updateSettings },
        mainWindow: {
            setFullscreen: vi.fn(async () => {}),
            setMaximized: vi.fn(async () => {}),
            setSize: vi.fn(async () => {}),
            setUiScale: vi.fn(async () => {}),
            setDisplay,
            onUiScaleNudged: vi.fn(() => () => {}),
            onWindowStateChanged,
        },
    })
);

const { initSettingsLogic } = await import("@renderer/logic/settings");
const { settingsStore } = await import("@renderer/store/settings.store");

describe("initSettingsLogic", () => {
    it("loads settings from main once", async () => {
        await initSettingsLogic();
        await initSettingsLogic();

        expect(getSettings).toHaveBeenCalledOnce();
        expect(settingsStore.isInitialized).toBe(true);
        expect(settingsStore.windowWidth).toBe(1280);
    });

    it("moves the window and saves when the display changes", async () => {
        settingsStore.displayIndex = 1;
        await nextTick();

        expect(setDisplay).toHaveBeenCalledWith(1);
        expect(updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({ displayIndex: 1 }));
    });

    it("follows the window's own size, but not while it is maximised", async () => {
        windowStateChanged({ maximized: false, size: { width: 1600, height: 900 } });
        windowStateChanged({ maximized: true, size: null });

        expect(settingsStore.maximized).toBe(true);
        expect(settingsStore.windowWidth).toBe(1600);
        expect(settingsStore.windowHeight).toBe(900);
    });
});
