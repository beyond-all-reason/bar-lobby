// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { path7za } from "7zip-bin";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readContentMaps, warnDuplicateCampaignMaps } from "@main/content/singleplayer/content-maps";
import { Problems } from "@main/content/singleplayer/problems";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import type { ContentProblem } from "@shared/content/singleplayer";

const QUICKSILVER = "Quicksilver Remake 1.24";
const ISTHMUS = "Supreme Isthmus v1.6.4";
const fixtures = path.resolve(__dirname, "../../fixtures/content");
const mapinfo = (name: string, version: string) => `local mapinfo = { name = "${name}", version = "${version}" }\nreturn mapinfo\n`;

let temp: string;

// An archive holding the given files, as a map's .sd7 is.
async function writeMap(file: string, files: Record<string, string>) {
    const staging = fs.mkdtempSync(path.join(temp, "staging-"));
    for (const [name, text] of Object.entries(files)) {
        fs.writeFileSync(path.join(staging, name), text);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await promisify(execFile)(path7za, ["a", "-t7z", file, "."], { cwd: staging });
    fs.rmSync(staging, { recursive: true, force: true });
}

beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "content-maps-"));
});
afterEach(() => {
    fs.rmSync(temp, { recursive: true, force: true });
});

describe("readContentMaps", () => {
    it("names each .sd7 in maps/ by its mapinfo.lua, as the client does", async () => {
        await writeMap(path.join(temp, "maps", "quicksilver.sd7"), { "mapinfo.lua": mapinfo("Quicksilver Remake", "1.24") });
        await writeMap(path.join(temp, "maps", "isthmus.sd7"), { "mapinfo.lua": mapinfo("Supreme Isthmus v1.6.4", "v1.6.4") });
        fs.writeFileSync(path.join(temp, "maps", "quicksilver.sd7.md5.gz"), "");
        const problems: ContentProblem[] = [];

        expect(await readContentMaps(temp, new Problems(problems))).toEqual(
            new Map([
                [ISTHMUS, path.join(temp, "maps", "isthmus.sd7")],
                [QUICKSILVER, path.join(temp, "maps", "quicksilver.sd7")],
            ])
        );
        expect(problems).toEqual([]);
    });

    it("warns about a .sdz, which the client doesn't read, and a map without mapinfo.lua", async () => {
        await writeMap(path.join(temp, "maps", "other.sdz"), { "mapinfo.lua": mapinfo("Other", "1") });
        await writeMap(path.join(temp, "maps", "broken.sd7"), { "readme.txt": "no mapinfo" });
        const problems: ContentProblem[] = [];

        expect(await readContentMaps(temp, new Problems(problems))).toEqual(new Map());
        expect(problems).toEqual([
            { path: path.join(temp, "maps", "broken.sd7"), severity: "warning", message: "Map name could not be read: it has no mapinfo.lua" },
            { path: path.join(temp, "maps", "other.sdz"), severity: "warning", message: "Only .sd7 maps are read, as the client reads them, so this map is ignored" },
        ]);
    });

    it("finds no maps without a maps folder", async () => {
        const problems: ContentProblem[] = [];

        expect(await readContentMaps(temp, new Problems(problems))).toEqual(new Map());
        expect(problems).toEqual([]);
    });

    it("reads a map again once its file changes", async () => {
        const file = path.join(temp, "maps", "map.sd7");
        await writeMap(file, { "mapinfo.lua": mapinfo("First", "1") });
        expect([...(await readContentMaps(temp, new Problems())).keys()]).toEqual(["First 1"]);

        fs.rmSync(file);
        await writeMap(file, { "mapinfo.lua": mapinfo("Second map", "2.0") });

        expect([...(await readContentMaps(temp, new Problems())).keys()]).toEqual(["Second map 2.0"]);
    });
});

describe("warnDuplicateCampaignMaps", () => {
    const campaign = path.join("campaigns", "sample");
    const file = (folder: string, name: string) => path.join(campaign, folder, "maps", `${name}.sd7`);
    const maps = (folder: string, ...names: string[]) => new Map(names.map((name) => [name, file(folder, name)]));
    const warnings = (shared: Map<string, string>, missions: Map<string, string>[]) => {
        const problems: ContentProblem[] = [];
        warnDuplicateCampaignMaps(campaign, shared, missions, new Problems(problems));

        return problems;
    };

    it("warns about a mission's copy of a map in shared/maps", () => {
        expect(warnings(maps("shared", QUICKSILVER), [maps("mission01", QUICKSILVER, ISTHMUS)])).toEqual([
            {
                path: file("mission01", QUICKSILVER),
                severity: "warning",
                message: `Map "${QUICKSILVER}" is also in ${path.join("shared", "maps", `${QUICKSILVER}.sd7`)}. A map used by several missions belongs only in shared/maps, one used by a single mission only in that mission's maps`,
            },
        ]);
    });

    it("warns about each copy of a map in several missions' maps", () => {
        const message = (other: string) => `Map "${ISTHMUS}" is also in ${path.relative(campaign, file(other, ISTHMUS))}. A map used by several missions belongs only in shared/maps`;

        expect(warnings(new Map(), [maps("mission01", ISTHMUS), maps("mission02", ISTHMUS)])).toEqual([
            { path: file("mission01", ISTHMUS), severity: "warning", message: message("mission02") },
            { path: file("mission02", ISTHMUS), severity: "warning", message: message("mission01") },
        ]);
    });

    it("accepts each map in one place", () => {
        expect(warnings(maps("shared", QUICKSILVER), [maps("mission01", ISTHMUS), new Map()])).toEqual([]);
    });
});

describe("loading content maps", () => {
    it("records the maps each scenario, campaign and mission ships, and warns about a duplicate", async () => {
        const root = path.join(temp, "content");
        for (const folder of [path.join("scenarios", "river-crossing"), path.join("campaigns", "sample-campaign")]) {
            fs.cpSync(path.join(fixtures, folder), path.join(root, folder), { recursive: true });
        }
        const campaign = path.join(root, "campaigns", "sample-campaign");
        await writeMap(path.join(root, "scenarios", "river-crossing", "maps", "isthmus.sd7"), { "mapinfo.lua": mapinfo("Supreme Isthmus v1.6.4", "v1.6.4") });
        await writeMap(path.join(campaign, "shared", "maps", "quicksilver.sd7"), { "mapinfo.lua": mapinfo("Quicksilver Remake", "1.24") });
        await writeMap(path.join(campaign, "mission01", "maps", "quicksilver.sd7"), { "mapinfo.lua": mapinfo("Quicksilver Remake", "1.24") });

        const content = await loadSingleplayerContent([{ source: "official", rootId: "official", path: root }]);

        expect(content.scenarios.map((scenario) => [scenario.id, scenario.maps])).toEqual([["river-crossing", [ISTHMUS]]]);
        const [loaded] = content.campaigns;
        expect(loaded.sharedMaps).toEqual([QUICKSILVER]);
        expect(loaded.missions.filter((mission) => mission.maps.length > 0).map((mission) => [mission.id, mission.maps])).toEqual([["mission01", [QUICKSILVER]]]);
        expect(content.problems).toEqual([
            {
                path: path.join(campaign, "mission01", "maps", "quicksilver.sd7"),
                severity: "warning",
                message: `Map "${QUICKSILVER}" is also in ${path.join("shared", "maps", "quicksilver.sd7")}. A map used by several missions belongs only in shared/maps, one used by a single mission only in that mission's maps`,
            },
        ]);
    });
});
