// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Settings } from "@main/services/settings.service";

let windowStateChanged: (state: { maximized: boolean; size: { width: number; height: number } | null }) => void = () => {};

const getSettings = vi.fn(async () => ({ fullscreen: false, maximized: false, windowWidth: 1280, windowHeight: 720, displayId: null, uiScale: null }) as unknown as Settings);
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

const { initSettingsLogic, settingsLogic } = await import("@renderer/logic/settings");
const { settingsStore } = await import("@renderer/store/settings.store");

describe("initSettingsLogic", () => {
    beforeAll(async () => {
        await initSettingsLogic();
    });

    it("loads settings from main once", async () => {
        await initSettingsLogic();

        expect(getSettings).toHaveBeenCalledOnce();
        expect(settingsStore.isInitialized).toBe(true);
        expect(settingsStore.windowWidth).toBe(1280);
    });

    it("moves the window and saves when the display changes", async () => {
        settingsLogic.update({ displayId: 2779098405 });
        await nextTick();

        expect(setDisplay).toHaveBeenCalledWith(2779098405);
        expect(updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({ displayId: 2779098405 }));
    });

    it("follows the window's own size, but not while it is maximised", async () => {
        windowStateChanged({ maximized: false, size: { width: 1600, height: 900 } });
        windowStateChanged({ maximized: true, size: null });

        expect(settingsStore.maximized).toBe(true);
        expect(settingsStore.windowWidth).toBe(1600);
        expect(settingsStore.windowHeight).toBe(900);
    });
});
