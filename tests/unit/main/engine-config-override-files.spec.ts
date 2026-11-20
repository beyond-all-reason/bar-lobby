// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readOverrides, readSnapshot, UnusableSettingsFileError, updateOverrides, writeSnapshot } from "@main/game/engine-config/override-files";

let dir: string;
let filePath: string;

beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-engine-settings-"));
    filePath = path.join(dir, "settings", "engine.json");
});

afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
});

const writeRaw = async (text: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, text);
};
const mtime = async () => (await fs.stat(filePath)).mtimeMs;

describe("master files", () => {
    it("reads a missing file as no overrides, and doesn't create one for none", async () => {
        expect(await readOverrides(filePath)).toEqual({ values: {} });
        expect(await updateOverrides(filePath, (values) => values)).toEqual({});
        expect(await fs.readdir(dir)).toEqual([]);
    });

    it("writes the format version and the values sorted, and reads them back", async () => {
        expect(await updateOverrides(filePath, () => ({ ui_scale: "0.9", snd_volmaster: "50" }))).toEqual({ snd_volmaster: "50", ui_scale: "0.9" });

        expect(JSON.parse(await fs.readFile(filePath, "utf8"))).toEqual({ formatVersion: 1, values: { snd_volmaster: "50", ui_scale: "0.9" } });
        expect(Object.keys(JSON.parse(await fs.readFile(filePath, "utf8")).values)).toEqual(["snd_volmaster", "ui_scale"]);
        expect(await readOverrides(filePath)).toEqual({ values: { snd_volmaster: "50", ui_scale: "0.9" } });
    });

    it("writes nothing when nothing changed, whatever the order", async () => {
        await writeRaw(JSON.stringify({ formatVersion: 1, values: { b: "2", a: "1" } }));
        const before = await mtime();
        const text = await fs.readFile(filePath, "utf8");

        await updateOverrides(filePath, () => ({ a: "1", b: "2" }));

        expect(await mtime()).toBe(before);
        expect(await fs.readFile(filePath, "utf8")).toBe(text);
    });

    it("keeps fields a newer client of the same format added", async () => {
        await writeRaw(JSON.stringify({ formatVersion: 1, values: { a: "1" }, note: "kept" }));
        await updateOverrides(filePath, (values) => ({ ...values, b: "2" }));

        expect(JSON.parse(await fs.readFile(filePath, "utf8"))).toEqual({ formatVersion: 1, values: { a: "1", b: "2" }, note: "kept" });
    });

    it.each([
        ["a newer format", JSON.stringify({ formatVersion: 2, values: { a: "1" }, renamed: true }), /newer client: format version 2/],
        ["invalid JSON, as from a half-synced file", '{"formatVersion": 1, "val', /Not valid JSON/],
        ["a value with a line break", JSON.stringify({ formatVersion: 1, values: { a: "1\nb = 2" } }), /pattern/],
        ["a key with an =", JSON.stringify({ formatVersion: 1, values: { "a=b": "1" } }), /property name/],
        ["no values", JSON.stringify({ formatVersion: 1 }), /values/],
    ])("leaves a file with %s alone", async (_case, text, problem) => {
        await writeRaw(text);

        expect(await readOverrides(filePath)).toEqual({ problem: expect.stringMatching(problem) });
        await expect(updateOverrides(filePath, () => ({ x: "1" }))).rejects.toThrow(UnusableSettingsFileError);
        expect(await fs.readFile(filePath, "utf8")).toBe(text);
        expect(await fs.readdir(path.dirname(filePath))).toEqual(["engine.json"]);
    });

    it("runs changes to one file one after another, so none is lost", async () => {
        await Promise.all(Array.from({ length: 10 }, (_, i) => updateOverrides(filePath, (values) => ({ ...values, [`k${i}`]: String(i) }))));

        expect(await readOverrides(filePath)).toEqual({ values: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k${i}`, String(i)])) });
    });

    // A crash between writing and renaming leaves the temp file, which a cloud sync must not upload.
    it("writes through a temp file whose name a *.json sync pattern doesn't match", async () => {
        const rename = vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("crashed"));
        await expect(updateOverrides(filePath, () => ({ a: "1" }))).rejects.toThrow("crashed");
        rename.mockRestore();

        const names = await fs.readdir(path.dirname(filePath));
        expect(names).toEqual(["engine.json.tmp"]);
        expect(names[0]).not.toMatch(/\.json$/);
        expect(await readOverrides(filePath)).toEqual({ values: {} });
    });
});

describe("snapshot", () => {
    const snapshotPath = () => path.join(dir, "engine-config", "applied.json");

    it("reads a missing snapshot as missing", async () => {
        expect(await readSnapshot(snapshotPath())).toEqual({ missing: true });
    });

    it("round trips with the format version added", async () => {
        await writeSnapshot(snapshotPath(), { profileId: "local", engineVersion: "2026.07.04", pid: 1234, values: { b: "2", a: "1" } });

        expect(await readSnapshot(snapshotPath())).toEqual({ snapshot: { formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", pid: 1234, values: { a: "1", b: "2" } } });
    });

    it("reports a snapshot it can't use", async () => {
        await fs.mkdir(path.dirname(snapshotPath()), { recursive: true });
        await fs.writeFile(snapshotPath(), JSON.stringify({ formatVersion: 1, engineVersion: "x", values: {} }));

        expect(await readSnapshot(snapshotPath())).toEqual({ problem: expect.stringMatching(/profileId/) });
    });
});
