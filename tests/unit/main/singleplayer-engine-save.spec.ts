// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEngineSaveHeader, savedMission } from "@main/content/singleplayer/engine-save";
import { encodeModoptionValue } from "@shared/startbox-modoptions";
import { fakeEngineSave } from "./fake-engine-save";

let dir: string;

beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-engine-save-"));
});

afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
});

// As the client's own mission start script writes it, trimmed to the keys read back.
async function missionScript(options: object) {
    return `[game]\n{\n\t[modoptions]\n\t{\n\t\tdeathmode=neverend;\n\t\tmissionoptions=${await encodeModoptionValue(options)};\n\t}\n\t[player0]\n\t{\n\t\tteam=0;\n\t\tname=Commander;\n\t}\n\tgametype=bar-campaign-sample 9.0;\n\tishost=1;\n\tmapname=CM02 v2;\n\tmyplayername=Commander;\n}\n`;
}

async function write(name: string, bytes: Buffer) {
    const file = path.join(dir, name);
    await fs.writeFile(file, bytes);
    return file;
}

describe("readEngineSaveHeader", () => {
    it("reads the engine version, start script and map name", async () => {
        const script = await missionScript({ entryPoint: "campaigns/sample/CM02/mission.lua", difficulty: "Medium" });
        const file = await write("a.ssf", fakeEngineSave("2026.11.04", script, "CM02 v2"));

        expect(await readEngineSaveHeader(file)).toEqual({ engineVersion: "2026.11.04", script, mapName: "CM02 v2" });
    });

    // Random text compresses to about half, so this header's compressed bytes run past the first read.
    it("reads a header too long for the first read", async () => {
        const script = `[game]\n{\n\tpadding=${crypto.randomBytes(150_000).toString("hex")};\n}\n`;
        const file = await write("long.ssf", fakeEngineSave("2026.11.04", script));

        expect((await readEngineSaveHeader(file)).script).toBe(script);
    });

    it("throws for a file that isn't a gzip stream, or ends before its header does", async () => {
        await expect(readEngineSaveHeader(await write("text.ssf", Buffer.from("not a save")))).rejects.toThrow();
        await expect(readEngineSaveHeader(await write("short.ssf", zlib.gzipSync(Buffer.from("2026.11.04\0[game]{"))))).rejects.toThrow(/no complete save header/);
    });
});

describe("savedMission", () => {
    it("names the mission a client-launched game was played from", async () => {
        const script = await missionScript({ entryPoint: "campaigns/sample/CM02/mission.lua", difficulty: "Medium" });

        expect(await savedMission({ engineVersion: "2026.11.04", script, mapName: "CM02 v2" })).toEqual({
            archiveName: "bar-campaign-sample 9.0",
            entryPoint: "campaigns/sample/CM02/mission.lua",
            difficulty: "Medium",
            playerName: "Commander",
        });
    });

    it("gives undefined for a game that isn't a mission, such as a skirmish", async () => {
        const script = "[game]\n{\n\tgametype=Beyond All Reason test-31820-45ea098;\n\tmapname=Quicksilver Remake 1.24;\n\tmyplayername=Commander;\n}\n";

        expect(await savedMission({ engineVersion: "2026.11.04", script, mapName: "Quicksilver Remake 1.24" })).toBeUndefined();
    });
});
