// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCfg, readCfg, serializeCfg, writeCfgAtomic } from "@main/game/engine-config/cfg-file";

const corruptedFixture = path.join(__dirname, "../../fixtures/engine-settings/corrupted-springsettings.cfg");

let dir: string;

beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-cfg-"));
});

afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
});

describe("parseCfg", () => {
    it("reads trimmed key = value lines, splitting at the first =", () => {
        expect(parseCfg("snd_volmaster = 30\n  ui_scale=0.94  \nInputTextGeo = 0.35 0.72 0.03 0.04\nexpr = a=b\nempty =\n")).toEqual({
            values: { snd_volmaster: "30", ui_scale: "0.94", InputTextGeo: "0.35 0.72 0.03 0.04", expr: "a=b", empty: "" },
            skipped: [],
        });
    });

    it("tolerates CRLF and a BOM, and ignores blank and comment lines", () => {
        expect(parseCfg(String.fromCharCode(0xfeff) + "# comment\r\n\r\nShadows = 1\r\n   # indented comment\r\nWater = 4\r\n")).toEqual({ values: { Shadows: "1", Water: "4" }, skipped: [] });
    });

    it("skips lines that can't be kept as a setting", () => {
        expect(parseCfg(" = 1\nno equals sign\nbad#key = 1\nok = 1\n")).toEqual({ values: { ok: "1" }, skipped: ["= 1", "no equals sign", "bad#key = 1"] });
    });

    it("keeps the last value of a key given twice", () => {
        expect(parseCfg("a = 1\na = 2\n").values).toEqual({ a: "2" });
    });

    it("reads the corrupted dev file without losing a real key", async () => {
        const { values, skipped } = parseCfg(await fs.readFile(corruptedFixture, "utf8"));

        expect(skipped).toEqual(["= 1"]);
        expect(values).toMatchObject({ version: "9", ersion: "8", acity: "0.6", music: "1", snd_volmaster: "30", InputTextGeo: "0.35 0.72 0.03 0.04" });
        expect(values.music_loadscreen_track).toBe("music/original/loading/leon devereux - surveillance protocol.ogg");
    });
});

describe("serializeCfg", () => {
    it("writes one key = value per line, sorted by code unit as the engine does", () => {
        expect(serializeCfg({ snd_volmaster: "7", ZZZCustomKey: "1", AdvSky: "0", empty: "" })).toBe("AdvSky = 0\nZZZCustomKey = 1\nempty = \nsnd_volmaster = 7\n");
    });

    it("round trips through parseCfg", async () => {
        const { values } = parseCfg(await fs.readFile(corruptedFixture, "utf8"));

        expect(parseCfg(serializeCfg(values))).toEqual({ values, skipped: [] });
    });
});

describe("readCfg and writeCfgAtomic", () => {
    it("reads a missing file as undefined", async () => {
        expect(await readCfg(path.join(dir, "springsettings.cfg"))).toBeUndefined();
    });

    it("throws when the file exists but can't be read", async () => {
        await expect(readCfg(dir)).rejects.toThrow();
    });

    it("writes the folder, the file and nothing else", async () => {
        const filePath = path.join(dir, "data", "springsettings.cfg");
        await writeCfgAtomic(filePath, { b: "2", a: "1" });

        expect(await fs.readdir(path.dirname(filePath))).toEqual(["springsettings.cfg"]);
        expect(await fs.readFile(filePath, "utf8")).toBe("a = 1\nb = 2\n");
        expect(await readCfg(filePath)).toEqual({ values: { a: "1", b: "2" }, skipped: [] });
    });

    it("replaces an existing file", async () => {
        const filePath = path.join(dir, "springsettings.cfg");
        await fs.writeFile(filePath, "old = 1\n");
        await writeCfgAtomic(filePath, { new: "2" });

        expect(await fs.readFile(filePath, "utf8")).toBe("new = 2\n");
    });
});
