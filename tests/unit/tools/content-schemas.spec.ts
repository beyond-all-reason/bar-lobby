// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { path7za } from "7zip-bin";
import Ajv2020 from "ajv/dist/2020";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSingleplayerContent } from "../../../src/main/content/singleplayer/singleplayer-loader";
import { contentMapFolders, duplicateCampaignMaps, missingMaps, readBundle, readMaps, unbundledItems } from "../../../tools/validate-content";

const repo = path.resolve(__dirname, "../../..");
const fixtures = path.join(repo, "tests", "fixtures");
const sample = path.join(fixtures, "content");

// The committed files, exactly as an author would copy them, through a validator that knows nothing of the
// client.
function validatorFor(name: string) {
    const schema = JSON.parse(fs.readFileSync(path.join(repo, "schemas", "content", `${name}.schema.json`), "utf8"));

    return new Ajv2020({ strict: true, allErrors: true }).compile(schema);
}

function readJson(...parts: string[]) {
    return JSON.parse(fs.readFileSync(path.join(...parts), "utf8"));
}

describe("exported content schemas", () => {
    const campaign = path.join(sample, "campaigns", "sample-campaign");
    const secondCampaign = path.join(sample, "campaigns", "second-campaign");
    const missionFolders = [
        ...[campaign, secondCampaign].flatMap((folder) =>
            fs
                .readdirSync(folder, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && entry.name !== "shared")
                .map((entry) => path.join(folder, entry.name))
        ),
        ...["sample-scenario", "river-crossing", "night-raid"].map((id) => path.join(sample, "scenarios", id)),
        ...["sample-tutorial", "movement", "economy", "combat", "final-exam"].map((id) => path.join(sample, "tutorials", id)),
    ];

    it("accept the sample index manifests", () => {
        const validate = validatorFor("index-manifest");

        for (const kind of ["campaigns", "scenarios", "tutorials"]) {
            expect(validate(readJson(sample, kind, "manifest.json")), kind).toBe(true);
        }
    });

    it.each([campaign, secondCampaign])("accept the sample campaign config and credits in %s, $schema key included", (folder) => {
        const config = readJson(folder, "campaignConfig.json");

        expect(config.$schema).toBeDefined();
        expect(validatorFor("campaign-config")(config)).toBe(true);
        expect(validatorFor("credits")(readJson(folder, "credits.json"))).toBe(true);
    });

    it("accept every sample mission manifest and mission config", () => {
        const manifests = validatorFor("mission-manifest");
        const configs = validatorFor("mission-config");

        for (const folder of missionFolders) {
            const manifest = readJson(folder, "manifest.json");
            expect(manifests(manifest), folder).toBe(true);
            for (const file of [manifest.config.default, ...Object.values<string>(manifest.config.numPlayers ?? {})]) {
                expect(configs(readJson(folder, file)), path.join(folder, file)).toBe(true);
            }
        }
    });

    it("accept the sample language files, nested and flat", () => {
        const validate = validatorFor("language-file");
        const languageFiles = [path.join(campaign, "shared", "language", "en.json"), path.join(campaign, "shared", "language", "fr.json"), path.join(campaign, "mission01", "language", "en.json")];

        for (const file of languageFiles) {
            expect(validate(readJson(file)), file).toBe(true);
        }
        expect(validate({ a: { b: 1 } })).toBe(false);
    });

    it("reject the schema violation fixture", () => {
        const validate = validatorFor("mission-manifest");

        expect(validate(readJson(fixtures, "content-broken", "scenarios", "schema-violation", "manifest.json"))).toBe(false);
        expect(validate.errors?.map((error) => error.message)).toEqual(expect.arrayContaining(["must have required property 'mapName'", "must be string"]));
    });

    it("accept only the listed start position types", () => {
        const validate = validatorFor("mission-config");
        const config = readJson(sample, "scenarios", "sample-scenario", "missionConfig.json");

        for (const startPosType of ["fixed", "random", "in-game", "in-client"]) {
            expect(validate({ ...config, startPosType }), startPosType).toBe(true);
        }
        for (const startPosType of ["boxes", "Fixed", "", 0]) {
            expect(validate({ ...config, startPosType }), String(startPosType)).toBe(false);
        }
    });

    it("accept only startscript-safe team and alliance names", () => {
        const validate = validatorFor("mission-config");
        const config = { alliances: { north: ["red_1"], south: ["Blue2"] }, playerTeam: ["red_1"] };

        expect(validate(config)).toBe(true);
        for (const bad of ["red team", "red;team", "red=team", "rød", ""]) {
            expect(validate({ ...config, alliances: { ...config.alliances, [bad]: ["green"] } }), `alliance ${bad}`).toBe(false);
            expect(validate({ ...config, alliances: { north: ["red_1", bad], south: ["Blue2"] } }), `team ${bad}`).toBe(false);
            expect(validate({ ...config, playerTeam: [bad] }), `player team ${bad}`).toBe(false);
            expect(validate({ ...config, allianceSettings: { [bad]: {} } }), `alliance settings ${bad}`).toBe(false);
            expect(validate({ ...config, allianceSettings: { north: { alliedWith: bad } } }), `allied with ${bad}`).toBe(false);
            expect(validate({ ...config, teamSettings: { [bad]: {} } }), `team settings ${bad}`).toBe(false);
        }
    });

    it("accept a team color of three numbers from 0 to 1", () => {
        const validate = validatorFor("mission-config");
        const config = { alliances: { north: ["red"] }, playerTeam: ["red"] };
        const withColor = (rgbColor: unknown) => ({ ...config, teamSettings: { red: { rgbColor } } });

        expect(validate(withColor([0, 0.5, 1]))).toBe(true);
        for (const rgbColor of [[255, 128, 0], [0.1, 0.5], [0.1, 0.5, 0.9, 1], [-0.1, 0.5, 0.9], "0.1 0.5 0.9", "#1a80e6"]) {
            expect(validate(withColor(rgbColor)), JSON.stringify(rgbColor)).toBe(false);
        }
    });

    it('accept "dev" compatibility, and no other word', () => {
        const campaigns = validatorFor("campaign-config");
        const manifests = validatorFor("mission-manifest");
        const config = readJson(campaign, "campaignConfig.json");
        const manifest = readJson(sample, "scenarios", "sample-scenario", "manifest.json");

        expect(campaigns({ ...config, compatibility: "dev" })).toBe(true);
        expect(manifests({ ...manifest, compatibility: "dev" })).toBe(true);
        for (const compatibility of ["Dev", "development", ""]) {
            expect(campaigns({ ...config, compatibility }), compatibility).toBe(false);
            expect(manifests({ ...manifest, compatibility }), compatibility).toBe(false);
        }
    });

    it("reject a rapid tag, an empty compatibility and an engine with no games", () => {
        const validate = validatorFor("mission-manifest");

        for (const name of ["rapid-tag", "empty-compatibility", "engine-without-games"]) {
            expect(validate(readJson(fixtures, "content-broken", "scenarios", name, "manifest.json")), name).toBe(false);
        }
    });
});

describe("validate-content --bundle", () => {
    const loadSample = () => loadSingleplayerContent([{ source: "official", rootId: "official", path: sample }]);
    const BUNDLED = { engineVersion: "2025.04.10", gameVersion: "Beyond All Reason test-28000-aaaaaaa" };

    describe("reading the assets folder", () => {
        let assets: string;
        const write = (folder: string, text: string) => {
            fs.mkdirSync(path.join(assets, folder), { recursive: true });
            fs.writeFileSync(path.join(assets, folder, "default.txt"), text);
        };

        beforeEach(() => {
            assets = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-"));
        });
        afterEach(() => fs.rmSync(assets, { recursive: true, force: true }));

        it("reads the pair the two default.txt files name", async () => {
            write("engine", "2025.04.10\n");
            write("games", "Beyond All Reason test-28000-aaaaaaa\n");

            expect(await readBundle(assets)).toEqual({ pair: BUNDLED });
        });

        // The client treats these as naming nothing; CI would then check against nothing.
        it("fails on a missing or empty file, naming each", async () => {
            write("games", "  \n");

            expect(await readBundle(assets)).toEqual({
                errors: [
                    expect.stringMatching(/engine[\\/]default\.txt is missing, so the bundle names no engine$/),
                    expect.stringMatching(/games[\\/]default\.txt is empty, so the bundle names no game$/),
                ],
            });
        });
    });

    it("passes when every item accepts the bundled pair", async () => {
        const content = await loadSample();

        expect(unbundledItems(content, BUNDLED)).toEqual([]);
    });

    // The sample accepts this engine and this game, but only ever with other partners.
    it("fails an item whose engine and game are each accepted but never together", async () => {
        const content = await loadSample();
        const failures = unbundledItems(content, { engineVersion: "2025.04.10", gameVersion: "Beyond All Reason test-28200-ccccccc" });

        expect(failures).toHaveLength(10);
        expect(failures[0]).toMatch(/^campaign sample-campaign .* It accepts: engine 2025\.04\.10 with games .*; engine 2025\.06\.01 with games /);
        expect(failures[1]).toMatch(/^campaign second-campaign /);
        expect(failures[2]).toMatch(/^scenario sample-scenario /);
        expect(failures[3]).toMatch(/^scenario river-crossing /);
        expect(failures[4]).toMatch(/^scenario night-raid /);
        expect(failures[5]).toMatch(/^tutorial sample-tutorial /);
        expect(failures[6]).toMatch(/^tutorial movement /);
        expect(failures[7]).toMatch(/^tutorial economy /);
        expect(failures[8]).toMatch(/^tutorial combat /);
        expect(failures[9]).toMatch(/^tutorial final-exam /);
    });

    it("fails every item when the engine is not bundled", async () => {
        const content = await loadSample();

        expect(unbundledItems(content, { ...BUNDLED, engineVersion: "2099.01.01" })).toHaveLength(10);
    });

    it("fails an item whose archive depends on another game", async () => {
        const content = await loadSample();
        const [scenario] = content.scenarios;
        const only = (item: typeof scenario) => ({ ...content, campaigns: [], tutorials: [], scenarios: [item] });

        expect(unbundledItems(only({ ...scenario, archiveDepend: [BUNDLED.gameVersion] }), BUNDLED)).toEqual([]);
        expect(unbundledItems(only({ ...scenario, archiveDepend: ["Beyond All Reason test-28100-bbbbbbb"] }), BUNDLED)).toEqual([
            expect.stringMatching(/^scenario sample-scenario .* has an archive whose modinfo\.lua depend doesn't name the bundled game Beyond All Reason test-28000-aaaaaaa$/),
        ]);
    });

    it("fails a campaign whose archive depends on another game", async () => {
        const content = await loadSample();
        const [campaign] = content.campaigns;
        const only = (item: typeof campaign) => ({ ...content, campaigns: [item], tutorials: [], scenarios: [] });

        expect(unbundledItems(only({ ...campaign, archiveDepend: [BUNDLED.gameVersion] }), BUNDLED)).toEqual([]);
        expect(unbundledItems(only({ ...campaign, archiveDepend: ["Beyond All Reason test-28100-bbbbbbb"] }), BUNDLED)).toEqual([
            expect.stringMatching(/^campaign sample-campaign .* has an archive whose modinfo\.lua depend doesn't name the bundled game Beyond All Reason test-28000-aaaaaaa$/),
        ]);
    });

    // Dev content only loads when the tool is told to allow it, and names no pair to check.
    it("passes over dev content", async () => {
        const content = await loadSample();
        const [scenario] = content.scenarios;

        expect(
            unbundledItems({ ...content, campaigns: [], tutorials: [], scenarios: [{ ...scenario, compatibility: "dev", archiveDepend: ["x"] }] }, { engineVersion: "2099.01.01", gameVersion: "x" })
        ).toEqual([]);
    });
});

describe("validate-content maps", () => {
    const loadSample = () => loadSingleplayerContent([{ source: "official", rootId: "official", path: sample }]);
    const QUICKSILVER = "Quicksilver Remake 1.24";
    const ISTHMUS = "Supreme Isthmus v1.6.4";
    // A maps/ folder's contents, as readMaps gives them.
    const mapsOf = (folder: string, ...names: string[]) => new Map(names.map((name) => [name, path.join(folder, "maps", `${name}.sd7`)]));

    describe("reading a maps folder", () => {
        let maps: string;
        let staging: string;
        // An archive holding the given files, as a map's .sd7 is.
        const writeMap = async (fileName: string, files: Record<string, string>) => {
            fs.rmSync(staging, { recursive: true, force: true });
            fs.mkdirSync(staging, { recursive: true });
            for (const [name, text] of Object.entries(files)) {
                fs.writeFileSync(path.join(staging, name), text);
            }
            await promisify(execFile)(path7za, ["a", "-t7z", path.join(maps, fileName), "."], { cwd: staging });
        };

        beforeEach(() => {
            maps = fs.mkdtempSync(path.join(os.tmpdir(), "maps-"));
            staging = fs.mkdtempSync(path.join(os.tmpdir(), "map-staging-"));
        });
        afterEach(() => {
            fs.rmSync(maps, { recursive: true, force: true });
            fs.rmSync(staging, { recursive: true, force: true });
        });

        it("names each .sd7 by its mapinfo.lua, as the client does", async () => {
            await writeMap("quicksilver.sd7", { "mapinfo.lua": 'local mapinfo = { name = "Quicksilver Remake", version = "1.24" }\nreturn mapinfo\n' });
            await writeMap("isthmus.sd7", { "mapinfo.lua": 'local mapinfo = { name = "Supreme Isthmus v1.6.4", version = "v1.6.4" }\nreturn mapinfo\n' });
            fs.writeFileSync(path.join(maps, "quicksilver.sd7.md5.gz"), "");

            expect(await readMaps(maps)).toEqual({
                maps: new Map([
                    [ISTHMUS, path.join(maps, "isthmus.sd7")],
                    [QUICKSILVER, path.join(maps, "quicksilver.sd7")],
                ]),
                problems: [],
            });
        });

        it("warns about a .sdz, which the client doesn't read, and a map without mapinfo.lua", async () => {
            await writeMap("other.sdz", { "mapinfo.lua": 'local mapinfo = { name = "Other" }\nreturn mapinfo\n' });
            await writeMap("broken.sd7", { "readme.txt": "no mapinfo" });

            expect(await readMaps(maps)).toEqual({
                maps: new Map(),
                problems: [
                    { path: path.join(maps, "broken.sd7"), severity: "warning", message: "Map name could not be read: it has no mapinfo.lua" },
                    { path: path.join(maps, "other.sdz"), severity: "warning", message: "Only .sd7 maps are read, as the client reads them, so this map is ignored" },
                ],
            });
        });

        it("finds no maps in a missing folder", async () => {
            expect(await readMaps(path.join(maps, "absent"))).toEqual({ maps: new Map(), problems: [] });
        });
    });

    it("looks in each scenario's and tutorial's folder, each campaign's shared/ and each campaign mission's folder", async () => {
        const content = await loadSample();
        const folders = contentMapFolders(content);

        expect(folders).toContain(path.join(content.campaigns[0].path, "shared"));
        expect(folders).toContain(content.campaigns[0].missions[0].path);
        expect(folders).toContain(content.scenarios[0].path);
        expect(folders).toContain(content.tutorials[0].path);
        expect(folders).toHaveLength(content.campaigns.length + content.campaigns.flatMap((campaign) => campaign.missions).length + content.scenarios.length + content.tutorials.length);
    });

    describe("missing maps", () => {
        it("passes when every map is bundled", async () => {
            expect(missingMaps(await loadSample(), new Set([QUICKSILVER, ISTHMUS]), new Map())).toEqual([]);
        });

        it("fails a scenario whose map is neither bundled nor in its own maps", async () => {
            expect(missingMaps(await loadSample(), new Set([QUICKSILVER]), new Map())).toEqual([
                expect.stringMatching(/^scenario river-crossing .* needs map "Supreme Isthmus v1\.6\.4", which is in neither the bundle's maps nor its own maps$/),
            ]);
        });

        it("accepts a scenario's or tutorial's map from its own maps only", async () => {
            const content = await loadSample();
            const riverCrossing = content.scenarios.find((scenario) => scenario.id === "river-crossing")!;
            const nightRaid = content.scenarios.find((scenario) => scenario.id === "night-raid")!;

            expect(missingMaps(content, new Set([QUICKSILVER]), new Map([[riverCrossing.path, mapsOf(riverCrossing.path, ISTHMUS)]]))).toEqual([]);
            expect(missingMaps(content, new Set([QUICKSILVER]), new Map([[nightRaid.path, mapsOf(nightRaid.path, ISTHMUS)]]))).toEqual([expect.stringMatching(/^scenario river-crossing /)]);
        });

        // Official campaigns ship their own maps; custom ones may use bundled maps.
        it("accepts a campaign mission's map from its campaign's shared/maps or its own maps", async () => {
            const content = await loadSample();
            const [sampleCampaign, secondCampaign] = content.campaigns;
            const [landing, ...otherSecondMissions] = secondCampaign.missions;
            const contentMaps = new Map([
                [path.join(sampleCampaign.path, "shared"), mapsOf(path.join(sampleCampaign.path, "shared"), QUICKSILVER)],
                [landing.path, mapsOf(landing.path, QUICKSILVER)],
            ]);
            const failures = missingMaps(content, new Set([ISTHMUS]), contentMaps);

            expect(failures.filter((failure) => failure.startsWith("campaign "))).toEqual(
                otherSecondMissions.map(({ id }) =>
                    expect.stringMatching(
                        new RegExp(
                            `^campaign second-campaign mission ${id} .* needs map "Quicksilver Remake 1\\.24", which is in none of the bundle's maps, the campaign's shared/maps or the mission's own maps$`
                        )
                    )
                )
            );
        });

        it("passes over dev content", async () => {
            const content = await loadSample();
            const dev = <T extends object>(item: T) => ({ ...item, compatibility: "dev" as const });

            expect(missingMaps({ ...content, campaigns: content.campaigns.map(dev), scenarios: content.scenarios.map(dev), tutorials: content.tutorials.map(dev) }, new Set(), new Map())).toEqual([]);
        });
    });

    describe("a campaign map in more than one place", () => {
        it("warns about a mission's copy of a map in shared/maps", async () => {
            const content = await loadSample();
            const [campaign] = content.campaigns;
            const shared = path.join(campaign.path, "shared");
            const mission = campaign.missions[1];

            expect(
                duplicateCampaignMaps(
                    content,
                    new Map([
                        [shared, mapsOf(shared, QUICKSILVER)],
                        [mission.path, mapsOf(mission.path, QUICKSILVER, ISTHMUS)],
                    ])
                )
            ).toEqual([
                {
                    path: path.join(mission.path, "maps", `${QUICKSILVER}.sd7`),
                    severity: "warning",
                    message: `Map "${QUICKSILVER}" is also in ${path.join("shared", "maps", `${QUICKSILVER}.sd7`)}. A map used by several missions belongs only in shared/maps, one used by a single mission only in that mission's maps`,
                },
            ]);
        });

        it("warns about each copy of a map in several missions' maps", async () => {
            const content = await loadSample();
            const [campaign] = content.campaigns;
            const [first, second] = campaign.missions;
            const file = (mission: typeof first) => path.join(mission.path, "maps", `${ISTHMUS}.sd7`);

            expect(
                duplicateCampaignMaps(
                    content,
                    new Map([
                        [first.path, mapsOf(first.path, ISTHMUS)],
                        [second.path, mapsOf(second.path, ISTHMUS)],
                    ])
                )
            ).toEqual([
                {
                    path: file(first),
                    severity: "warning",
                    message: `Map "${ISTHMUS}" is also in ${path.relative(campaign.path, file(second))}. A map used by several missions belongs only in shared/maps`,
                },
                {
                    path: file(second),
                    severity: "warning",
                    message: `Map "${ISTHMUS}" is also in ${path.relative(campaign.path, file(first))}. A map used by several missions belongs only in shared/maps`,
                },
            ]);
        });

        it("accepts each map in one place, and the same map in two campaigns", async () => {
            const content = await loadSample();
            const [sampleCampaign, secondCampaign] = content.campaigns;
            const shared = (campaign: typeof sampleCampaign) => path.join(campaign.path, "shared");

            expect(
                duplicateCampaignMaps(
                    content,
                    new Map([
                        [shared(sampleCampaign), mapsOf(shared(sampleCampaign), QUICKSILVER)],
                        [sampleCampaign.missions[0].path, mapsOf(sampleCampaign.missions[0].path, ISTHMUS)],
                        [shared(secondCampaign), mapsOf(shared(secondCampaign), QUICKSILVER)],
                    ])
                )
            ).toEqual([]);
        });
    });
});
