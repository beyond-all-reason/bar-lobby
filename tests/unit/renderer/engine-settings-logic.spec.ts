// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";
import en from "@renderer/assets/languages/en.json";
import type { EngineSettingText } from "@renderer/logic/engine-settings/descriptors";
import type { EngineSettingsView } from "@shared/engine-settings/view";

const api = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), reset: vi.fn(), onChanged: vi.fn() }));
vi.mock("@renderer/api/engine-settings", () => ({ engineSettingsApi: api }));

const { engineSettingsStore } = await import("@renderer/store/engine-settings.store");
const { effectiveValue, engineSettingsLogic, initEngineSettingsLogic } = await import("@renderer/logic/engine-settings");
const { CURATED_ENGINE_SETTING_DESCRIPTORS, engineSettingDescriptors, matchesQuery } = await import("@renderer/logic/engine-settings/descriptors");

const descriptor = (key: string) => CURATED_ENGINE_SETTING_DESCRIPTORS.find((entry) => entry.key === key)!;
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
    engineVars,
});

// One of each kind the engine lists, by the names it really has.
const engineVars: EngineSettingsView["engineVars"] = {
    snd_volmaster: { type: "int", description: "Master sound volume.", min: 0, max: 200 },
    snd_volmusic: { type: "int", min: 0, max: 200 },
    AdvMapShading: { type: "bool", description: "Enable shaders for terrain rendering." },
    MSAALevel: { type: "int", min: 0, max: 32 },
    BumpWaterAnisotropy: { type: "float", min: 0, max: 16 },
    XResolution: { type: "int", min: 0 },
    CamDollyFOV: { type: "float" },
    AutohostIP: { type: "std::string", description: "Engine text, with no string of its own." },
    SpringData: { type: "std::string", readOnly: true },
    AdvSky: { type: "bool", deprecated: true },
};

const shownAs = (text: EngineSettingText) => ("key" in text ? `[${text.key}]` : text.text);

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
    it("start with the game's own ranges, groups and categories for the volumes and the interface scale", () => {
        expect(CURATED_ENGINE_SETTING_DESCRIPTORS.map(({ key, min, max, step, group, category }) => ({ key, min, max, step, group, category }))).toEqual([
            { key: "snd_volmaster", min: 0, max: 80, step: 2, group: "sound", category: "basic" },
            { key: "snd_volmusic", min: 0, max: 99, step: 1, group: "sound", category: "basic" },
            { key: "ui_scale", min: 0.8, max: 1.3, step: 0.01, group: "ui", category: "basic" },
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

describe("generated descriptors", () => {
    const generated = (overrides: Record<string, unknown> = {}) => engineSettingDescriptors(engineVars, overrides);
    const find = (key: string, overrides: Record<string, unknown> = {}) => generated(overrides).find((entry) => entry.key === key);

    it("put the curated ones first, then every other variable by key, in the dev category", () => {
        expect(generated().map(({ key, category }) => `${category} ${key}`)).toEqual([
            "basic snd_volmaster",
            "basic snd_volmusic",
            "basic ui_scale",
            "dev AdvMapShading",
            "dev AutohostIP",
            "dev BumpWaterAnisotropy",
            "dev CamDollyFOV",
            "dev MSAALevel",
            "dev XResolution",
        ]);
    });

    it("pick a control from the variable's type and limits", () => {
        expect(find("AdvMapShading")).toMatchObject({ control: "checkbox" });
        expect(find("MSAALevel")).toMatchObject({ control: "slider", min: 0, max: 32, step: 1 });
        expect(find("BumpWaterAnisotropy")).toMatchObject({ control: "slider", min: 0, max: 16, step: 0.01 });
        expect(find("XResolution")).toMatchObject({ control: "number", min: 0, max: undefined, integer: true });
        expect(find("CamDollyFOV")).toMatchObject({ control: "number", integer: false });
        expect(find("AutohostIP")).toMatchObject({ control: "text" });
    });

    it("label each by its key, described by its string if there is one, else the engine's text", () => {
        expect(find("AdvMapShading")).toMatchObject({ label: { text: "AdvMapShading" }, description: { key: "lobby.navbar.settings.engine.descriptions.AdvMapShading" } });
        expect(find("AutohostIP")?.description).toEqual({ text: "Engine text, with no string of its own." });
        expect(find("MSAALevel")?.description).toEqual({ key: "lobby.navbar.settings.engine.descriptions.MSAALevel" });
        expect(find("BumpWaterAnisotropy")?.description).toBeUndefined();
    });

    it("leave out read-only variables, and deprecated ones unless overridden, so those can still be reset", () => {
        expect(find("SpringData", { SpringData: {} })).toBeUndefined();
        expect(find("AdvSky")).toBeUndefined();
        expect(find("AdvSky", { AdvSky: {} })).toMatchObject({ control: "checkbox", category: "dev" });
    });

    it("offer an override the engine doesn't list, such as a game's own key, as text", () => {
        const opacity = find("ui_opacity", { ui_opacity: {}, snd_volmusic: {}, ui_scale: {} });
        expect(opacity).toMatchObject({ control: "text", label: { text: "ui_opacity" }, category: "dev" });
        expect(opacity?.description).toBeUndefined();
        expect(generated({ ui_scale: {} }).filter((entry) => entry.key === "ui_scale")).toHaveLength(1);
    });

    it("mark the keys kept on this machine only", () => {
        expect(find("XResolution")?.deviceOnly).toBe(true);
        expect(find("MSAALevel")?.deviceOnly).toBe(true);
        expect(find("CamDollyFOV")?.deviceOnly).toBe(false);
        expect(masterVolume.deviceOnly).toBe(false);
    });

    it("read and write bools as the engine does", () => {
        const shading = find("AdvMapShading")!;
        if (shading.control !== "checkbox") throw new Error("not a checkbox");

        expect(["1", "2", "true", "Yes", " on "].map(shading.parse)).toEqual([true, true, true, true, true]);
        expect(["0", "false", "NO", "off"].map(shading.parse)).toEqual([false, false, false, false]);
        expect(shading.parse("maybe")).toBeUndefined();
        expect([shading.format(true), shading.format(false)]).toEqual(["1", "0"]);
    });

    it("write numbers clamped to whichever limits there are, whole for an integer", () => {
        const resolution = find("XResolution")!;
        const fov = find("CamDollyFOV")!;
        if (resolution.control !== "number" || fov.control !== "number") throw new Error("not number boxes");

        expect([resolution.format(-5), resolution.format(1919.6), resolution.format(100000)]).toEqual(["0", "1920", "100000"]);
        expect(fov.format(-12.5)).toBe("-12.5");
    });

    it("write text without the spaces springsettings.cfg can't hold around a value", () => {
        const ip = find("AutohostIP")!;
        if (ip.control !== "text") throw new Error("not text");

        expect(ip.format(" 10.0.0.1 ")).toBe("10.0.0.1");
    });
});

describe("matchesQuery", () => {
    const shading = engineSettingDescriptors(engineVars, {}).find((entry) => entry.key === "AdvMapShading")!;
    const show = (text: EngineSettingText) => ("key" in text ? "Enable shaders for terrain rendering." : text.text);

    it("finds every word of the query in the key, label or description, ignoring case", () => {
        expect(matchesQuery(shading, "", show)).toBe(true);
        expect(matchesQuery(shading, "advmap", show)).toBe(true);
        expect(matchesQuery(shading, "TERRAIN shaders", show)).toBe(true);
        expect(matchesQuery(shading, "terrain water", show)).toBe(false);
    });

    it("searches a curated setting by what the player reads", () => {
        expect(matchesQuery(masterVolume, "master volume", (text) => ("key" in text ? "In-game master volume" : text.text))).toBe(true);
    });
});

describe("description strings", () => {
    it("show the engine's text as it is, characters vue-i18n gives a meaning included", () => {
        const { t } = createI18n({ legacy: false, locale: "en", messages: { en } }).global;

        expect(t("lobby.navbar.settings.engine.descriptions.AllowDrawModelPostDeferredEvents")).toBe("Enable Draw{Units,Features}PostDeferred Lua callins.");
        expect(t("lobby.navbar.settings.engine.descriptions.MinSimDrawBalance")).toContain("15% of the total cpu time");
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

    it("lists the settings in a category, matching a query", async () => {
        await engineSettingsLogic.load();

        expect(engineSettingsLogic.descriptors("basic").map((entry) => entry.key)).toEqual(["snd_volmaster", "snd_volmusic", "ui_scale"]);
        expect(engineSettingsLogic.descriptors("dev").map((entry) => entry.key)).toContain("XResolution");
        expect(engineSettingsLogic.descriptors("dev", "anisotropy", shownAs).map((entry) => entry.key)).toEqual(["BumpWaterAnisotropy"]);
        expect(engineSettingsLogic.descriptors("advanced")).toEqual([]);
    });

    it("writes a checkbox's value as the engine reads a bool", async () => {
        await engineSettingsLogic.load();
        const shading = engineSettingsLogic.descriptors("dev").find((entry) => entry.key === "AdvMapShading")!;
        api.set.mockResolvedValue(succeeded(view({ AdvMapShading: { value: "0", scope: "device" } })));

        if (shading.control !== "checkbox") throw new Error("not a checkbox");
        await engineSettingsLogic.set(shading, false);

        expect(api.set).toHaveBeenCalledWith("AdvMapShading", "0");
        expect(engineSettingsLogic.value(shading)).toBe(false);
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
