// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { path7za } from "7zip-bin";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import type { ContentRoot } from "@shared/content/singleplayer";

const fixtures = path.resolve(__dirname, "../../fixtures");
const official: ContentRoot = { source: "official", rootId: "official", path: path.join(fixtures, "content") };
const custom: ContentRoot = { source: "custom", rootId: "custom", path: path.join(fixtures, "content-custom") };
const broken: ContentRoot = { source: "custom", rootId: "custom", path: path.join(fixtures, "content-broken") };
// The mission API team's example scenario, with its mission archive.
const sdz: ContentRoot = { source: "custom", rootId: "custom", path: path.join(fixtures, "content-sdz") };

describe("loadSingleplayerContent", () => {
    describe("sample content", () => {
        it("loads every item without problems", async () => {
            const content = await loadSingleplayerContent([official]);

            expect(content.problems).toEqual([]);
            expect(content.campaigns.map((c) => c.id)).toEqual(["sample-campaign", "second-campaign"]);
            expect(content.scenarios.map((s) => s.id)).toEqual(["sample-scenario", "river-crossing", "night-raid"]);
            expect(content.tutorials.map((t) => t.id)).toEqual(["sample-tutorial", "movement", "economy", "combat", "final-exam"]);
        });

        it("reads a campaign's missions, configs, text and media", async () => {
            const [campaign] = (await loadSingleplayerContent([official])).campaigns;
            const folder = path.join(official.path, "campaigns", "sample-campaign");

            expect(campaign).toMatchObject({ kind: "campaign", source: "official", rootId: "official", id: "sample-campaign", path: folder });
            expect(campaign.credits).toHaveLength(1);
            expect(Object.keys(campaign.language).sort()).toEqual(["en", "fr"]);
            expect(campaign.backgroundImageUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "background.png"))}`);
            expect(campaign.logoUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "sample-logo.png"))}`);
            expect(campaign.compatibility).toEqual(campaign.config.compatibility);
            expect(campaign).toMatchObject({ difficulties: ["story", "easy", "medium", "hard"], defaultDifficulty: "medium" });
            expect(campaign.missions.map((m) => m.id)).toEqual(["tutorial", "mission01", "mission02", "missionA", "missionB", "optionalMissionA", "optionalMissionB", "finalMission"]);

            const mission01 = campaign.missions[1];
            expect(mission01.configs.default.playerTeam).toEqual(["heroes"]);
            expect(Object.keys(mission01.configs.numPlayers)).toEqual(["1", "2"]);
            expect(mission01.configs.numPlayers["2"].playerTeam).toEqual(["heroes", "allies"]);
            expect(mission01.language.en).toBeDefined();
            // A campaign mission's images come from the campaign's shared media, not its own folder.
            expect(mission01.imageUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "mission01_image.png"))}`);
            expect(mission01.backgroundImageUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "mission01_background.png"))}`);
        });

        it("reads scenarios and tutorials with their own compatibility", async () => {
            const content = await loadSingleplayerContent([official]);
            const [scenario] = content.scenarios;
            const [tutorial] = content.tutorials;

            expect(scenario).toMatchObject({ kind: "scenario", source: "official", rootId: "official" });
            expect(scenario.compatibility).toHaveLength(2);
            expect(scenario).toMatchObject({ difficulties: ["easy", "medium", "hard"], defaultDifficulty: "medium" });
            expect(tutorial).toMatchObject({ kind: "tutorial", id: "sample-tutorial" });
        });

        it("ignores a $schema key", async () => {
            const [campaign] = (await loadSingleplayerContent([official])).campaigns;

            expect(campaign.config).toHaveProperty("$schema");
        });
    });

    it("keeps official and custom items with the same id apart", async () => {
        const content = await loadSingleplayerContent([official, custom]);

        expect(content.campaigns.map(({ source, rootId, id }) => ({ source, rootId, id }))).toEqual([
            { source: "official", rootId: "official", id: "sample-campaign" },
            { source: "official", rootId: "official", id: "second-campaign" },
            { source: "custom", rootId: "custom", id: "sample-campaign" },
        ]);
        expect(content.scenarios.map(({ source, id }) => ({ source, id }))).toEqual([
            { source: "official", id: "sample-scenario" },
            { source: "official", id: "river-crossing" },
            { source: "official", id: "night-raid" },
            { source: "custom", id: "custom-skirmish" },
            { source: "custom", id: "sample-scenario" },
        ]);
        expect(content.problems).toEqual([]);
    });

    it("treats a root that does not exist as empty", async () => {
        const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: path.join(fixtures, "no-such-root") }]);

        expect(content).toEqual({ campaigns: [], scenarios: [], tutorials: [], problems: [] });
    });

    describe("broken content", () => {
        const expected: [string, RegExp][] = [
            ["scenarios/bad-json/manifest.json", /Not valid JSON/],
            ["scenarios/schema-violation/manifest.json", /required property 'mapName'/],
            ["scenarios/schema-violation/manifest.json", /\/titleKey must be string/],
            ["scenarios/id-mismatch/manifest.json", /missionId "some-other-id" does not match its folder name "id-mismatch"/],
            ["scenarios/missing-files/manifest.json", /Mission config "noConfig.json" does not exist/],
            ["scenarios/path-traversal/manifest.json", /Mission config "..\/still-valid\/missionConfig.json" is outside/],
            ["scenarios/unknown-team/missionConfig.json", /playerTeam names team "nobody"/],
            ["scenarios/unknown-team/missionConfig.json", /teamSettings names team "ghosts"/],
            ["scenarios/bad-team-name/missionConfig.json", /\/alliances must NOT have additional properties \(got "good guys"\)\. .*letters, digits and underscores only/],
            ["scenarios/bad-team-name/missionConfig.json", /\/alliances\/enemies\/1 must match pattern .*"hench;men".*letters, digits and underscores only/],
            ["scenarios/newer-format/manifest.json", /Requires a newer client: format version 99/],
            ["scenarios/no-compatibility/manifest.json", /compatibility is required/],
            ["scenarios/no-difficulties/manifest.json", /difficulties and defaultDifficulty are required/],
            ["scenarios/bad-default-difficulty/manifest.json", /defaultDifficulty "story" is not one of difficulties \(easy, medium, hard\)/],
            ["scenarios/empty-compatibility/manifest.json", /\/compatibility must NOT have fewer than 1 items/],
            ["scenarios/engine-without-games/manifest.json", /\/compatibility\/0\/gameVersions must NOT have fewer than 1 items/],
            ["scenarios/duplicate-engine/manifest.json", /lists engine 2025.04.10 more than once/],
            ["scenarios/rapid-tag/manifest.json", /gameVersions\/0 must match pattern .*"byar:test".*Rapid tags/],
            // The start script would end the map's name at the ;.
            ["scenarios/unsafe-map-name/manifest.json", /\/mapName must match pattern .*"Quicksilver;Remake 1\.24".*No semicolons/],
            // The engine lowercases keys, so only lowercase ones are accepted.
            ["scenarios/uppercase-option-key/missionConfig.json", /\/modOptions must NOT have additional properties \(got "DeathMode"\)\..*Lowercase letters/],
            ["campaigns/dangling-unlock/campaignConfig.json", /missions.mission01.victoryUnlocks names mission "nowhere"/],
            ["campaigns/shared-mission/campaignConfig.json", /A mission may not be named "shared"/],
        ];

        it.each(expected)("reports %s: %s", async (file, message) => {
            const { problems } = await loadSingleplayerContent([broken]);

            expect(problems).toContainEqual({ path: path.join(broken.path, file), severity: "error", message: expect.stringMatching(message) });
        });

        it("reports nothing else, and still loads the valid item beside them", async () => {
            const content = await loadSingleplayerContent([broken]);

            expect(content.problems).toHaveLength(expected.length);
            expect(content.campaigns).toEqual([]);
            expect(content.scenarios.map((s) => s.id)).toEqual(["still-valid"]);
        });
    });

    describe("folders", () => {
        let root: string;

        beforeEach(async () => {
            root = await fs.mkdtemp(path.join(os.tmpdir(), "bar-content-"));
            for (const name of ["alpha", "beta", "gamma"]) {
                await fs.cp(path.join(official.path, "scenarios", "sample-scenario"), path.join(root, "scenarios", name), { recursive: true });
                const manifestPath = path.join(root, "scenarios", name, "manifest.json");
                const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
                await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, missionId: name, $schema: undefined }));
            }
        });

        afterEach(async () => {
            await fs.rm(root, { recursive: true, force: true });
        });

        it("orders by the index manifest, then by id, and warns about names it does not have", async () => {
            await fs.writeFile(path.join(root, "scenarios", "manifest.json"), JSON.stringify({ order: ["gamma", "missing"] }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["gamma", "alpha", "beta"]);
            expect(content.problems).toEqual([{ path: path.join(root, "scenarios", "manifest.json"), severity: "warning", message: expect.stringMatching(/"missing"/) }]);
        });

        // The start script puts each player on the next team in playerTeam.
        it("refuses a config for more players than its playerTeam has teams", async () => {
            const manifestPath = path.join(root, "scenarios", "alpha", "manifest.json");
            const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
            const defaultConfig = JSON.parse(await fs.readFile(path.join(root, "scenarios", "alpha", manifest.config.default), "utf8"));
            const players = String(defaultConfig.playerTeam.length + 1);
            await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, config: { ...manifest.config, numPlayers: { [players]: manifest.config.default } } }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["beta", "gamma"]);
            expect(content.problems).toEqual([
                {
                    path: manifestPath,
                    severity: "error",
                    message: `config.numPlayers "${players}" names ${manifest.config.default}, whose playerTeam has only ${defaultConfig.playerTeam.length} of the ${players} teams it needs`,
                },
            ]);
        });

        it("leaves out every folder whose id differs from another only in case", async (context) => {
            try {
                await fs.mkdir(path.join(root, "scenarios", "Alpha"));
            } catch {
                // A case-insensitive file system can't hold both folders, so there is nothing to test.
                context.skip();
            }
            await fs.cp(path.join(root, "scenarios", "alpha"), path.join(root, "scenarios", "Alpha"), { recursive: true });

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["beta", "gamma"]);
            expect(content.problems).toEqual([
                { path: path.join(root, "scenarios", "Alpha"), severity: "error", message: 'Id "Alpha" differs from "alpha" only in case' },
                { path: path.join(root, "scenarios", "alpha"), severity: "error", message: 'Id "alpha" differs from "Alpha" only in case' },
            ]);
        });

        it("reports a wrong startPosType once, with every value it takes", async () => {
            const configPath = path.join(root, "scenarios", "alpha", "missionConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, startPosType: "boxes" }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.problems.map((p) => p.message)).toEqual([
                '/startPosType must be equal to one of the allowed values (got "boxes"). Expected one of "fixed", "random", "in-game", "in-client"',
            ]);
        });

        // English is what every language falls back to, so text only in another language still shows the key.
        it("warns about language keys with no English text, and still loads the item", async () => {
            const editJson = async (file: string, change: (json: Record<string, unknown>) => object) => fs.writeFile(file, JSON.stringify(change(JSON.parse(await fs.readFile(file, "utf8")))));
            const alpha = path.join(root, "scenarios", "alpha");
            await editJson(path.join(alpha, "manifest.json"), (manifest) => ({ ...manifest, titleKey: "missions.alpha.title" }));
            await fs.writeFile(path.join(alpha, "language", "fr.json"), JSON.stringify({ "missions.alpha.title": "Alpha" }));
            await editJson(path.join(alpha, "missionConfig.json"), (config) => ({ ...config, teamSettings: { heroes: { displayNameKey: "teams.nobody" } } }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["alpha", "beta", "gamma"]);
            expect(content.problems).toEqual([
                { path: path.join(alpha, "manifest.json"), severity: "warning", message: expect.stringMatching(/^titleKey "missions.alpha.title" has no text in en.json/) },
                { path: path.join(alpha, "missionConfig.json"), severity: "warning", message: expect.stringMatching(/^teamSettings.heroes.displayNameKey "teams.nobody" has no text in en.json/) },
            ]);
        });

        it("looks a campaign mission's keys up in its own language folder, then the campaign's", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            const manifestPath = path.join(campaign, "mission01", "manifest.json");
            const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
            // One key only the campaign's shared/language/ has, one nobody has.
            await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, titleKey: "missions.tutorial.title", descriptionKey: "missions.mission01.nothing" }));
            const configPath = path.join(campaign, "campaignConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, $schema: undefined, descriptionKey: "campaign.nothing" }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toHaveLength(1);
            expect(content.problems).toEqual([
                { path: configPath, severity: "warning", message: expect.stringMatching(/^descriptionKey "campaign.nothing" has no text/) },
                { path: manifestPath, severity: "warning", message: expect.stringMatching(/^descriptionKey "missions.mission01.nothing" has no text/) },
            ]);
        });

        it("refuses a campaign whose default difficulty it doesn't offer", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            const configPath = path.join(campaign, "campaignConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, difficulties: ["easy", "medium"], defaultDifficulty: "hard" }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toEqual([]);
            expect(content.problems).toEqual([{ path: configPath, severity: "error", message: 'defaultDifficulty "hard" is not one of difficulties (easy, medium)' }]);
        });

        it("warns that a campaign mission's own difficulties are ignored", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            const manifestPath = path.join(campaign, "mission01", "manifest.json");
            const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
            await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, difficulties: ["hard"], defaultDifficulty: "hard" }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toHaveLength(1);
            expect(content.problems).toEqual([{ path: manifestPath, severity: "warning", message: expect.stringMatching(/difficulties and defaultDifficulty are ignored in a campaign mission/) }]);
        });

        // So a content repository can be cloned straight into a content root.
        it("skips hidden folders", async () => {
            await fs.mkdir(path.join(root, ".git"));
            await fs.mkdir(path.join(root, "scenarios", ".github"));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["alpha", "beta", "gamma"]);
            expect(content.problems).toEqual([]);
        });

        it("gives an item's images from its own media folder, and reports ones that are missing", async () => {
            for (const [name, image, backgroundImage] of [
                ["alpha", "preview.png", "background.png"],
                ["beta", "missing.png", "missing-background.png"],
                // The sample scenario these are copied from has images, so this one drops them.
                ["gamma", undefined, undefined],
            ] as const) {
                const manifestPath = path.join(root, "scenarios", name, "manifest.json");
                const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
                await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, image, backgroundImage }));
            }
            const media = path.join(root, "scenarios", "alpha", "media");
            await fs.mkdir(media, { recursive: true });
            await fs.writeFile(path.join(media, "preview.png"), "");
            await fs.writeFile(path.join(media, "background.png"), "");

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            const mediaUrl = (file: string) => `bar://${encodeURIComponent(path.join(media, file))}`;
            expect(content.scenarios.map((s) => [s.id, s.imageUrl, s.backgroundImageUrl])).toEqual([
                ["alpha", mediaUrl("preview.png"), mediaUrl("background.png")],
                ["gamma", undefined, undefined],
            ]);
            const betaManifest = path.join(root, "scenarios", "beta", "manifest.json");
            expect(content.problems).toEqual([
                { path: betaManifest, severity: "error", message: 'image "missing.png" does not exist' },
                { path: betaManifest, severity: "error", message: 'backgroundImage "missing-background.png" does not exist' },
            ]);
        });

        it("warns about a campaign folder that is not one of its missions", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            await fs.mkdir(path.join(campaign, "notes"));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toHaveLength(1);
            expect(content.problems).toEqual([{ path: path.join(campaign, "notes"), severity: "warning", message: expect.stringMatching(/not a mission/) }]);
        });

        it("refuses a campaign whose mission ids differ only in case", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            const configPath = path.join(campaign, "campaignConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, $schema: undefined, missions: { ...config.missions, MISSION01: {} } }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toEqual([]);
            expect(content.problems.filter((p) => p.severity === "error")).toEqual([
                { path: configPath, severity: "error", message: 'Mission "mission01" differs from "MISSION01" only in case' },
                { path: configPath, severity: "error", message: 'Mission "MISSION01" differs from "mission01" only in case' },
            ]);
        });

        it("reports a kind folder that is a file", async () => {
            await fs.rm(path.join(root, "scenarios"), { recursive: true });
            await fs.writeFile(path.join(root, "scenarios"), "");

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.problems).toEqual([{ path: path.join(root, "scenarios"), severity: "error", message: "Expected a folder, but this is a file" }]);
        });

        it("refuses an item whose language folder is a file", async () => {
            await fs.rm(path.join(root, "scenarios", "alpha", "language"), { recursive: true });
            await fs.writeFile(path.join(root, "scenarios", "alpha", "language"), "");

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.scenarios.map((s) => s.id)).toEqual(["beta", "gamma"]);
            expect(content.problems).toContainEqual({ path: path.join(root, "scenarios", "alpha", "language"), severity: "error", message: "Expected a folder, but this is a file" });
        });

        it("warns about missions that can never become available", async () => {
            const campaign = path.join(root, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaign, { recursive: true });
            const configPath = path.join(campaign, "campaignConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, $schema: undefined, missions: { ...config.missions, mission02: { failureUnlocks: ["tutorial"] } } }));

            const content = await loadSingleplayerContent([{ source: "custom", rootId: "custom", path: root }]);

            expect(content.campaigns).toHaveLength(1);
            expect(content.problems.map((p) => p.message)).toEqual([
                'Mission "missionA" can never become available from startMission',
                'Mission "missionB" can never become available from startMission',
                'Mission "optionalMissionA" can never become available from startMission',
                'Mission "optionalMissionB" can never become available from startMission',
                'Mission "finalMission" can never become available from startMission',
                "No finalMission can become available, so the campaign can never be finished",
            ]);
        });
    });

    describe("dev content", () => {
        let root: ContentRoot;
        let campaignConfig: string;
        let scenarioManifest: string;

        // The sample campaign and scenario, marked as still in development.
        beforeEach(async () => {
            root = { source: "custom", rootId: "custom", path: await fs.mkdtemp(path.join(os.tmpdir(), "bar-content-")) };
            campaignConfig = path.join(root.path, "campaigns", "sample-campaign", "campaignConfig.json");
            scenarioManifest = path.join(root.path, "scenarios", "sample-scenario", "manifest.json");
            for (const [kind, id, file] of [
                ["campaigns", "sample-campaign", campaignConfig],
                ["scenarios", "sample-scenario", scenarioManifest],
            ]) {
                await fs.cp(path.join(official.path, kind, id), path.join(root.path, kind, id), { recursive: true });
                const json = JSON.parse(await fs.readFile(file, "utf8"));
                await fs.writeFile(file, JSON.stringify({ ...json, $schema: undefined, compatibility: "dev" }));
            }
        });

        afterEach(async () => {
            await fs.rm(root.path, { recursive: true, force: true });
        });

        it("leaves it out with an error outside dev mode", async () => {
            const content = await loadSingleplayerContent([root]);

            expect(content.campaigns).toEqual([]);
            expect(content.scenarios).toEqual([]);
            expect(content.problems).toEqual([
                { path: campaignConfig, severity: "error", message: expect.stringMatching(/compatibility is "dev", which loads only in dev mode/) },
                { path: scenarioManifest, severity: "error", message: expect.stringMatching(/compatibility is "dev", which loads only in dev mode/) },
            ]);
        });

        it("loads it with a warning in dev mode", async () => {
            const content = await loadSingleplayerContent([root], { devContent: true });

            expect(content.campaigns.map((c) => [c.id, c.compatibility])).toEqual([["sample-campaign", "dev"]]);
            expect(content.scenarios.map((s) => [s.id, s.compatibility])).toEqual([["sample-scenario", "dev"]]);
            expect(content.problems).toEqual([
                { path: campaignConfig, severity: "warning", message: expect.stringMatching(/has not been tested on a released engine and game/) },
                { path: scenarioManifest, severity: "warning", message: expect.stringMatching(/has not been tested on a released engine and game/) },
            ]);
        });

        // Only the string branch of compatibility is reported, not that it should have been a list of pairs.
        it("reports a misspelt dev with what it expected", async () => {
            const json = JSON.parse(await fs.readFile(scenarioManifest, "utf8"));
            await fs.writeFile(scenarioManifest, JSON.stringify({ ...json, compatibility: "Dev" }));

            const content = await loadSingleplayerContent([root], { devContent: true });

            expect(content.problems.filter((p) => p.path === scenarioManifest).map((p) => p.message)).toEqual(['/compatibility must be equal to constant (got "Dev"). Expected "dev"']);
        });

        it("changes nothing for released content in dev mode", async () => {
            const content = await loadSingleplayerContent([official], { devContent: true });

            expect(content.problems).toEqual([]);
        });
    });

    describe("mission archives", () => {
        const GAME = "Beyond All Reason test-31820-45ea098";
        let root: ContentRoot;
        let archive: string;

        const modinfo = (fields: Record<string, string>) =>
            `return {\n${Object.entries(fields)
                .map(([key, value]) => `    ${key} = ${value},`)
                .join("\n")}\n}\n`;
        const scenarioModinfo = modinfo({ name: '"bar-scenario-outpost-strike"', version: '"1.0"', depend: `{ "${GAME}" }` });

        // Builds an archive holding exactly these files, replacing any already there.
        async function writeArchive(archivePath: string, files: Record<string, string>) {
            const staging = await fs.mkdtemp(path.join(os.tmpdir(), "bar-archive-"));
            try {
                for (const [name, text] of Object.entries(files)) {
                    await fs.mkdir(path.dirname(path.join(staging, name)), { recursive: true });
                    await fs.writeFile(path.join(staging, name), text);
                }
                await fs.mkdir(path.dirname(archivePath), { recursive: true });
                await fs.rm(archivePath, { force: true });
                await promisify(execFile)(path7za, ["a", "-tzip", archivePath, "."], { cwd: staging });
            } finally {
                await fs.rm(staging, { recursive: true, force: true });
            }
        }

        async function setManifest(change: Record<string, unknown>) {
            const manifestPath = path.join(root.path, "scenarios", "outpost-strike", "manifest.json");
            await fs.writeFile(manifestPath, JSON.stringify({ ...JSON.parse(await fs.readFile(manifestPath, "utf8")), ...change }));
        }

        beforeEach(async () => {
            root = { source: "custom", rootId: "custom", path: await fs.mkdtemp(path.join(os.tmpdir(), "bar-content-")) };
            await fs.cp(sdz.path, root.path, { recursive: true });
            archive = path.join(root.path, "scenarios", "outpost-strike", "games", "bar-scenario-outpost-strike.sdz");
        });

        afterEach(async () => {
            await fs.rm(root.path, { recursive: true, force: true });
        });

        it("loads the example scenario with its archive, start-script name and depend", async () => {
            const content = await loadSingleplayerContent([sdz]);

            expect(content.problems).toEqual([]);
            expect(content.scenarios.map((s) => [s.id, s.archivePath, s.archiveName, s.archiveDepend])).toEqual([
                [
                    "outpost-strike",
                    path.join(sdz.path, "scenarios", "outpost-strike", "games", "bar-scenario-outpost-strike.sdz"),
                    "bar-scenario-outpost-strike 1.0",
                    ["Beyond All Reason test-31820-45ea098"],
                ],
            ]);
        });

        // Until missions launch, an item without an archive loads; see the TODO in mission-archive.ts.
        it("doesn't use an archive outside games/, and warns about one at the item's root", async () => {
            const atRoot = path.join(root.path, "scenarios", "outpost-strike", "bar-scenario-outpost-strike.sdz");
            await fs.rename(archive, atRoot);

            const content = await loadSingleplayerContent([root]);

            expect(content.problems).toEqual([{ path: atRoot, severity: "warning", message: expect.stringContaining(`Move it to ${archive}`) }]);
            expect(content.scenarios.map((s) => [s.id, s.archivePath])).toEqual([["outpost-strike", undefined]]);
        });

        it("leaves out an item whose archive cannot be opened", async () => {
            await fs.writeFile(archive, "not an archive");

            const content = await loadSingleplayerContent([root]);

            expect(content.scenarios).toEqual([]);
            expect(content.problems).toEqual([{ path: archive, severity: "error", message: expect.stringMatching(/^Archive could not be opened/) }]);
        });

        it.each([
            ["modinfo.lua", { "scenarios/outpost-strike/mission.lua": "return {}" }, /no modinfo\.lua at its root/],
            ["the mission's Lua", { "modinfo.lua": scenarioModinfo }, /no scenarios\/outpost-strike\/mission\.lua/],
            // The engine's file system tells case apart on Linux.
            ["the mission's Lua in the right case", { "modinfo.lua": scenarioModinfo, "scenarios/Outpost-Strike/mission.lua": "return {}" }, /no scenarios\/outpost-strike\/mission\.lua/],
        ])("leaves out an item whose archive lacks %s", async (_, files, message) => {
            await writeArchive(archive, files);

            const content = await loadSingleplayerContent([root]);

            expect(content.scenarios).toEqual([]);
            expect(content.problems).toEqual([{ path: archive, severity: "error", message: expect.stringMatching(message) }]);
        });

        it.each([
            ["isn't a plain table", "local name = 'x'\nreturn { name = name, version = '1.0' }", /plain table of literal values/],
            ["has no version", modinfo({ name: '"bar-scenario-outpost-strike"', depend: `{ "${GAME}" }` }), /must set version/],
            [
                "names another archive",
                modinfo({ name: '"bar-scenario-other"', version: '"1.0"', depend: `{ "${GAME}" }` }),
                /names the archive "bar-scenario-other", but its file is named for "bar-scenario-outpost-strike"/,
            ],
            [
                "depends on a game not in compatibility",
                modinfo({ name: '"bar-scenario-outpost-strike"', version: '"1.0"', depend: '{ "Beyond All Reason test-1-abc" }' }),
                /depend names "Beyond All Reason test-1-abc", but none of the games in compatibility/,
            ],
            ["depends on nothing", modinfo({ name: '"bar-scenario-outpost-strike"', version: '"1.0"' }), /has no depend/],
        ])("leaves out an item whose modinfo.lua %s", async (_, lua, message) => {
            await writeArchive(archive, { "modinfo.lua": lua, "scenarios/outpost-strike/mission.lua": "return {}" });

            const content = await loadSingleplayerContent([root]);

            expect(content.scenarios).toEqual([]);
            expect(content.problems).toEqual([{ path: archive, severity: "error", message: expect.stringMatching(message) }]);
        });

        it("doesn't check depend against compatibility for content still in development", async () => {
            await setManifest({ compatibility: "dev" });
            await writeArchive(archive, {
                "modinfo.lua": modinfo({ name: '"bar-scenario-outpost-strike"', version: '"2.0"', depend: '{ "Beyond All Reason test-1-abc" }' }),
                "scenarios/outpost-strike/mission.lua": "return {}",
            });

            const content = await loadSingleplayerContent([root], { devContent: true });

            expect(content.problems.filter((problem) => problem.severity === "error")).toEqual([]);
            expect(content.scenarios.map((s) => s.archiveName)).toEqual(["bar-scenario-outpost-strike 2.0"]);
        });

        it("leaves out content still in development whose modinfo.lua depends on nothing", async () => {
            await setManifest({ compatibility: "dev" });
            await writeArchive(archive, { "modinfo.lua": modinfo({ name: '"bar-scenario-outpost-strike"', version: '"2.0"' }), "scenarios/outpost-strike/mission.lua": "return {}" });

            const content = await loadSingleplayerContent([root], { devContent: true });

            expect(content.scenarios).toEqual([]);
            expect(content.problems.filter((problem) => problem.severity === "error")).toEqual([{ path: archive, severity: "error", message: expect.stringMatching(/has no depend/) }]);
        });

        // The campaign's folder is a data directory at launch, so the engine reads these folders as its own.
        it.each([
            ["games", "which holds the campaign's mission archive"],
            ["maps", "which the engine reads maps from"],
            ["packages", "which the engine reads packages from"],
        ])("refuses a campaign mission named %s", async (name, why) => {
            const campaignFolder = path.join(root.path, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaignFolder, { recursive: true });
            const configPath = path.join(campaignFolder, "campaignConfig.json");
            const config = JSON.parse(await fs.readFile(configPath, "utf8"));
            await fs.writeFile(configPath, JSON.stringify({ ...config, $schema: undefined, missions: { ...config.missions, [name]: {} } }));

            const content = await loadSingleplayerContent([root]);

            expect(content.campaigns).toEqual([]);
            expect(content.problems).toContainEqual({ path: configPath, severity: "error", message: `A mission may not be named "${name}", ${why}` });
        });

        it("checks a campaign's archive for each mission's Lua", async () => {
            const campaignFolder = path.join(root.path, "campaigns", "sample-campaign");
            await fs.cp(path.join(official.path, "campaigns", "sample-campaign"), campaignFolder, { recursive: true });
            const campaignArchive = path.join(campaignFolder, "games", "bar-campaign-sample-campaign.sdz");
            const missionIds = ["tutorial", "mission01", "mission02", "missionA", "missionB", "optionalMissionA", "optionalMissionB", "finalMission"];
            const files = {
                "modinfo.lua": modinfo({ name: '"bar-campaign-sample-campaign"', version: '"3"', depend: '{ "Beyond All Reason test-28000-aaaaaaa" }' }),
                ...Object.fromEntries(missionIds.map((missionId) => [`campaigns/sample-campaign/${missionId}/mission.lua`, "return {}"])),
            };

            await writeArchive(campaignArchive, files);
            expect((await loadSingleplayerContent([root])).campaigns.map((c) => [c.archivePath, c.archiveName, c.archiveDepend])).toEqual([
                [campaignArchive, "bar-campaign-sample-campaign 3", ["Beyond All Reason test-28000-aaaaaaa"]],
            ]);

            await writeArchive(campaignArchive, Object.fromEntries(Object.entries(files).filter(([name]) => !name.includes("/mission02/"))));
            const content = await loadSingleplayerContent([root]);
            expect(content.campaigns).toEqual([]);
            expect(content.problems).toEqual([{ path: campaignArchive, severity: "error", message: expect.stringMatching(/no campaigns\/sample-campaign\/mission02\/mission\.lua/) }]);
        });
    });
});
