// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { loadSingleplayerContent } from "../../../src/main/content/singleplayer/singleplayer-loader";
import { unbundledItems } from "../../../tools/validate-content";

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

    it("reject a rapid tag, an empty compatibility and an engine with no games", () => {
        const validate = validatorFor("mission-manifest");

        for (const name of ["rapid-tag", "empty-compatibility", "engine-without-games"]) {
            expect(validate(readJson(fixtures, "content-broken", "scenarios", name, "manifest.json")), name).toBe(false);
        }
    });
});

describe("validate-content --bundle", () => {
    const loadSample = () => loadSingleplayerContent([{ source: "official", rootId: "official", path: sample }]);

    it("passes when every item accepts a bundled pair", async () => {
        const content = await loadSample();

        expect(unbundledItems(content, [{ engineVersion: "2025.04.10", gameVersions: ["Beyond All Reason test-28000-aaaaaaa"] }])).toEqual([]);
    });

    // The sample accepts this engine and this game, but only ever with other partners.
    it("fails an item whose engine and game are each accepted but never together", async () => {
        const content = await loadSample();
        const failures = unbundledItems(content, [{ engineVersion: "2025.04.10", gameVersions: ["Beyond All Reason test-28200-ccccccc"] }]);

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

        expect(unbundledItems(content, [{ engineVersion: "2099.01.01", gameVersions: ["Beyond All Reason test-28000-aaaaaaa"] }])).toHaveLength(10);
    });
});
