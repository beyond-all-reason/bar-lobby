// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineSettingsView } from "@shared/engine-settings/view";

const api = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), reset: vi.fn(), onChanged: vi.fn() }));
vi.mock("@renderer/api/engine-settings", () => ({ engineSettingsApi: api }));

const { engineSettingsStore } = await import("@renderer/store/engine-settings.store");
const { effectiveValue, engineSettingsLogic, initEngineSettingsLogic } = await import("@renderer/logic/engine-settings");
const { ENGINE_SETTING_DESCRIPTORS } = await import("@renderer/logic/engine-settings/descriptors");

const descriptor = (key: string) => ENGINE_SETTING_DESCRIPTORS.find((entry) => entry.key === key)!;
const masterVolume = descriptor("snd_volmaster");
const musicVolume = descriptor("snd_volmusic");
const uiScale = descriptor("ui_scale");

const succeeded = <T>(data: T) => ({ status: "success", data }) as const;
const failed = (reason: string) => ({ status: "failed", reason }) as const;

const view = (overrides: EngineSettingsView["overrides"] = {}): EngineSettingsView => ({
    status: { usable: true },
    overrides,
    clientDefaults: { snd_volmaster: "30" },
    // No ui_scale: only the game reads it, so the engine has no default for it.
    engineDefaults: { snd_volmaster: "60", snd_volmusic: "50" },
});

beforeEach(() => {
    api.get.mockReset().mockResolvedValue(succeeded(view()));
    api.set.mockReset();
    api.reset.mockReset();
});

describe("effectiveValue", () => {
    it("takes the override, else the client's default, else the engine's", () => {
        const current = view({ snd_volmusic: { value: "20", scope: "synced" } });

        expect(effectiveValue(current, "snd_volmusic")).toEqual({ text: "20", from: "override" });
        expect(effectiveValue(current, "snd_volmaster")).toEqual({ text: "30", from: "client" });
        expect(effectiveValue(view(), "snd_volmusic")).toEqual({ text: "50", from: "engine" });
        expect(effectiveValue(view(), "unknown")).toBeUndefined();
        expect(effectiveValue(view(), "constructor")).toBeUndefined();
    });
});

describe("descriptors", () => {
    it("start with the game's own ranges for the volumes and the interface scale", () => {
        expect(ENGINE_SETTING_DESCRIPTORS.map(({ key, min, max, step }) => ({ key, min, max, step }))).toEqual([
            { key: "snd_volmaster", min: 0, max: 80, step: 2 },
            { key: "snd_volmusic", min: 0, max: 99, step: 1 },
            { key: "ui_scale", min: 0.8, max: 1.3, step: 0.01 },
        ]);
    });

    it("read numbers, and nothing else, from the file's text", () => {
        expect(masterVolume.parse("46")).toBe(46);
        expect(uiScale.parse("0.94")).toBe(0.94);
        // Out of range, as set by hand: shown as it is.
        expect(masterVolume.parse("150")).toBe(150);
        expect(masterVolume.parse("")).toBeUndefined();
        expect(masterVolume.parse("loud")).toBeUndefined();
    });

    it("write values clamped, snapped to the step, and printed plainly", () => {
        expect(masterVolume.format(47)).toBe("48");
        expect(masterVolume.format(120)).toBe("80");
        expect(masterVolume.format(-5)).toBe("0");
        expect(musicVolume.format(33.4)).toBe("33");
        expect(uiScale.format(0.94)).toBe("0.94");
        expect(uiScale.format(0.8 + 0.1 + 0.2)).toBe("1.1");
        expect(uiScale.format(1)).toBe("1");
        expect(uiScale.format(0.5)).toBe("0.8");
    });
});

describe("engineSettingsLogic", () => {
    it("loads the settings and shows each descriptor's value", async () => {
        api.get.mockResolvedValue(succeeded(view({ snd_volmusic: { value: "20", scope: "synced" } })));

        await engineSettingsLogic.load();

        expect(engineSettingsLogic.value(musicVolume)).toBe(20);
        expect(engineSettingsLogic.value(masterVolume)).toBe(30);
        expect(engineSettingsLogic.isOverridden("snd_volmusic")).toBe(true);
        expect(engineSettingsLogic.isOverridden("snd_volmaster")).toBe(false);
        expect(engineSettingsLogic.scopeOf("snd_volmusic")).toBe("synced");
        expect(engineSettingsStore.loadError).toBeUndefined();
    });

    it("shows the game's own default for a key nothing sets, which the engine doesn't know", async () => {
        await engineSettingsLogic.load();

        expect(engineSettingsLogic.value(uiScale)).toBe(1);
        expect(engineSettingsLogic.isOverridden("ui_scale")).toBe(false);
    });

    it("keeps the reason a load failed", async () => {
        api.get.mockResolvedValue(failed("settings_unusable"));

        await engineSettingsLogic.load();

        expect(engineSettingsStore.loadError).toBe("settings_unusable");
        expect(engineSettingsLogic.failureKey("settings_unusable")).toBe("lobby.logic.engineSettings.failures.settingsUnusable");
    });

    it("writes the formatted value and shows the view main answers with", async () => {
        api.set.mockResolvedValue(succeeded(view({ snd_volmaster: { value: "48", scope: "synced" } })));

        expect(await engineSettingsLogic.set(masterVolume, 47)).toBe(true);

        expect(api.set).toHaveBeenCalledWith("snd_volmaster", "48");
        expect(engineSettingsLogic.value(masterVolume)).toBe(48);
    });

    it("keeps why a change failed, until the next one to that setting succeeds", async () => {
        api.set.mockResolvedValueOnce(failed("invalid_setting"));
        expect(await engineSettingsLogic.set(uiScale, 1.1)).toBe(false);
        expect(engineSettingsStore.changeErrors.get("ui_scale")).toBe("invalid_setting");

        api.reset.mockResolvedValueOnce(succeeded(view()));
        expect(await engineSettingsLogic.reset(uiScale)).toBe(true);
        expect(engineSettingsStore.changeErrors.has("ui_scale")).toBe(false);
        expect(api.reset).toHaveBeenCalledWith("ui_scale");
    });

    it("words a reason main doesn't know, or no answer at all, as a plain failure", async () => {
        api.set.mockResolvedValueOnce(failed("something_new"));
        await engineSettingsLogic.set(musicVolume, 10);
        expect(engineSettingsStore.changeErrors.get("snd_volmusic")).toBe("settings_failed");

        api.set.mockRejectedValueOnce(new Error("no answer"));
        await engineSettingsLogic.set(masterVolume, 10);
        expect(engineSettingsStore.changeErrors.get("snd_volmaster")).toBe("settings_failed");
    });

    it("follows every change main reports, such as one a game made", async () => {
        initEngineSettingsLogic();
        initEngineSettingsLogic();
        expect(api.onChanged).toHaveBeenCalledTimes(1);
        const report = api.onChanged.mock.calls[0][0] as (view: EngineSettingsView) => void;

        report(view({ ui_scale: { value: "0.94", scope: "synced" } }));

        expect(engineSettingsLogic.value(uiScale)).toBe(0.94);
    });
});
