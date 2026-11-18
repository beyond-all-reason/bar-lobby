// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCfg } from "@main/game/engine-config/cfg-file";
import {
    adoptCfg,
    applyChanges,
    clientChanges,
    diffValues,
    effectiveOverrides,
    findTruncatedKeys,
    gameOwned,
    type Overrides,
    removeOverride,
    setOverride,
    withoutGameOwned,
} from "@main/game/engine-config/overrides";

const corruptedFixture = path.join(__dirname, "../../fixtures/engine-settings/corrupted-springsettings.cfg");

// The engine variables among the fixture's keys that are also the end of another of its keys.
const knownEngineKeys = new Set(["FontFile", "FontOutlineWeight", "FontOutlineWidth", "FontSize", "Water"]);
const isKnownKey = (key: string) => knownEngineKeys.has(key);
const nothingKnown = () => false;

const none: Overrides = { synced: {}, device: {} };

describe("diffValues", () => {
    it("reports keys added or changed as set, and keys gone as removed", () => {
        expect(diffValues({ same: "1", changed: "1", gone: "1" }, { same: "1", changed: "2", added: "3" })).toEqual({ set: { changed: "2", added: "3" }, removed: ["gone"] });
    });

    it("treats values as exact strings, as the engine does", () => {
        expect(diffValues({ ui_scale: "0.5" }, { ui_scale: "0.50" })).toEqual({ set: { ui_scale: "0.50" }, removed: [] });
    });

    it("isn't fooled by keys that name Object.prototype members", () => {
        expect(diffValues({}, { constructor: "1", toString: "2" })).toEqual({ set: { constructor: "1", toString: "2" }, removed: [] });
        expect(diffValues({ constructor: "1" }, {})).toEqual({ set: {}, removed: ["constructor"] });
    });
});

describe("routing", () => {
    it("puts device keys in the device file and everything else, unknown keys included, in the synced file", () => {
        let overrides = setOverride(none, "XResolution", "2560");
        overrides = setOverride(overrides, "snd_volmaster", "50");
        overrides = setOverride(overrides, "SomeKeyNobodyKnows", "1");

        expect(overrides).toEqual({ synced: { snd_volmaster: "50", SomeKeyNobodyKnows: "1" }, device: { XResolution: "2560" } });
    });

    it("moves a key to the file it now belongs in when it is next set", () => {
        const misplaced: Overrides = { synced: { Shadows: "1" }, device: { ui_scale: "1" } };

        expect(setOverride(setOverride(misplaced, "Shadows", "2"), "ui_scale", "0.9")).toEqual({ synced: { ui_scale: "0.9" }, device: { Shadows: "2" } });
    });

    it("uses a misplaced key until then, preferring the file it belongs in", () => {
        expect(effectiveOverrides({ synced: { Shadows: "1", ui_scale: "1" }, device: { XResolution: "800" } })).toEqual({ Shadows: "1", ui_scale: "1", XResolution: "800" });
        expect(effectiveOverrides({ synced: { Shadows: "1", ui_scale: "1" }, device: { Shadows: "2", ui_scale: "2" } })).toEqual({ Shadows: "2", ui_scale: "1" });
    });

    it("removes a key from both files", () => {
        expect(removeOverride({ synced: { Shadows: "1", a: "1" }, device: { Shadows: "2" } }, "Shadows")).toEqual({ synced: { a: "1" }, device: {} });
    });

    it("leaves the overrides it was given alone", () => {
        const overrides: Overrides = { synced: { a: "1" }, device: {} };
        setOverride(overrides, "a", "2");
        removeOverride(overrides, "a");

        expect(overrides).toEqual({ synced: { a: "1" }, device: {} });
    });
});

describe("applyChanges", () => {
    const overrides: Overrides = { synced: { snd_volmaster: "50", AdvSky: "1", ui_scale: "1" }, device: { XResolution: "800" } };

    it("sets what changed, routed, and resets what was removed", () => {
        const diff = { set: { ui_scale: "0.9", YResolution: "600" }, removed: ["snd_volmaster", "XResolution"] };

        expect(applyChanges(overrides, diff, () => false)).toEqual({ synced: { AdvSky: "1", ui_scale: "0.9" }, device: { YResolution: "600" } });
    });

    it("keeps a removed key when told to, as for one this engine version deprecates", () => {
        const diff = { set: {}, removed: ["AdvSky", "snd_volmaster"] };

        expect(applyChanges(overrides, diff, (key) => key === "AdvSky")).toEqual({ synced: { AdvSky: "1", ui_scale: "1" }, device: { XResolution: "800" } });
    });
});

describe("findTruncatedKeys", () => {
    it("drops the tails of other lines from the corrupted dev file, and keeps real keys", async () => {
        const { values } = parseCfg(await fs.readFile(corruptedFixture, "utf8"));
        const truncated = findTruncatedKeys(values, isKnownKey);

        expect(truncated.sort()).toEqual(["ExposureMult", "acity", "apE", "itSunMult", "lt", "nMult", "nitSunMult", "on", "sion", "t", "ult", "unMult"].sort());
        // A known engine variable is never a fragment, whatever it ends.
        expect(truncated).not.toContain("Water");
        expect(truncated).not.toContain("FontSize");
        // A real key that ends another, with another value.
        expect(truncated).not.toContain("music");
        // A fragment of a value that changed since can't be told from a real key.
        expect(truncated).not.toContain("ersion");
    });

    it("needs the same value, not only the same ending", () => {
        expect(findTruncatedKeys({ snd_volmusic: "30", music: "1" }, nothingKnown)).toEqual([]);
        expect(findTruncatedKeys({ snd_volmusic: "30", music: "30" }, nothingKnown)).toEqual(["music"]);
    });
});

describe("game-owned keys", () => {
    it("leaves the game's own changes out of what the client folds back", () => {
        const diff = diffValues({ snd_volbattle: "68", MouseDragSelectionThreshold: "21", ui_scale: "1" }, { snd_volbattle: "83", ui_scale: "0.9", music_loadscreen_track: "a.ogg" });

        expect(clientChanges(diff)).toEqual({ set: { ui_scale: "0.9" }, removed: [] });
    });

    it("clears them from a master copy written before they were known as such", () => {
        expect(withoutGameOwned({ synced: { snd_volbattle: "83", snd_volmaster: "50" }, device: { MouseDragBoxCommandThreshold: "48", XResolution: "3840" } })).toEqual({
            synced: { snd_volmaster: "50" },
            device: { XResolution: "3840" },
        });
    });

    it("picks them out of a file, to carry through", () => {
        expect(gameOwned({ snd_volbattle: "83", snd_volmaster: "50", music_loadscreen_track: "a.ogg" })).toEqual({ snd_volbattle: "83", music_loadscreen_track: "a.ogg" });
    });
});

describe("adoptCfg", () => {
    const clientDefaults = { snd_volmaster: "30", Shadows: "1" };

    it("drops values equal to the client defaults and truncated keys, and says why", () => {
        const file = { snd_volmaster: "30", Shadows: "2", ui_opacity: "0.6", acity: "0.6", music: "1", snd_volbattle: "68" };

        expect(adoptCfg(file, none, clientDefaults, nothingKnown)).toEqual({
            overrides: { synced: { ui_opacity: "0.6", music: "1" }, device: { Shadows: "2" } },
            dropped: [
                { key: "snd_volmaster", value: "30", reason: "default" },
                { key: "acity", value: "0.6", reason: "truncated" },
                { key: "snd_volbattle", value: "68", reason: "game-owned" },
            ],
        });
    });

    it("on a conflict, takes the file's device keys and keeps the master's synced keys", () => {
        const master: Overrides = { synced: { ui_scale: "0.8", snd_volmusic: "10" }, device: { XResolution: "1920" } };
        const file = { ui_scale: "1", XResolution: "2560", YResolution: "1440", snd_volui: "68" };

        expect(adoptCfg(file, master, clientDefaults, nothingKnown).overrides).toEqual({
            synced: { ui_scale: "0.8", snd_volmusic: "10", snd_volui: "68" },
            device: { XResolution: "2560", YResolution: "1440" },
        });
    });

    it("adopts the whole corrupted dev file into a fresh master", async () => {
        const { values } = parseCfg(await fs.readFile(corruptedFixture, "utf8"));
        const { overrides, dropped } = adoptCfg(values, none, { snd_volmaster: "30", snd_volmusic: "30" }, isKnownKey);

        expect(dropped.filter((entry) => entry.reason === "default").map((entry) => entry.key)).toEqual(["snd_volmaster", "snd_volmusic"]);
        expect(dropped.filter((entry) => entry.reason === "game-owned").map((entry) => entry.key)).toEqual([
            "MouseDragBoxCommandThreshold",
            "MouseDragCircleCommandThreshold",
            "MouseDragFrontCommandThreshold",
            "MouseDragSelectionThreshold",
            "music_loadscreen_track",
            "snd_volbattle",
        ]);
        expect(overrides.device).toMatchObject({ XResolutionWindowed: "2560", MSAALevel: "4", Water: "4", Shadows: "1" });
        expect(overrides.synced).toMatchObject({ ui_scale: "0.94", version: "9", music: "1" });
        expect(overrides.synced).not.toHaveProperty("acity");
        expect(Object.keys(overrides.synced).length + Object.keys(overrides.device).length + dropped.length).toBe(Object.keys(values).length);
    });
});
