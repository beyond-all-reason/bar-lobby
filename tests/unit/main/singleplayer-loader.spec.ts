// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import type { ContentRoot } from "@shared/content/singleplayer";

const fixtures = path.resolve(__dirname, "../../fixtures");
const official: ContentRoot = { source: "official", rootId: "official", path: path.join(fixtures, "content") };
const custom: ContentRoot = { source: "custom", rootId: "custom", path: path.join(fixtures, "content-custom") };
const broken: ContentRoot = { source: "custom", rootId: "custom", path: path.join(fixtures, "content-broken") };

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
            expect(campaign.missions.map((m) => m.id)).toEqual(["tutorial", "mission01", "mission02", "missionA", "missionB", "optionalMissionA", "optionalMissionB", "finalMission"]);

            const mission01 = campaign.missions[1];
            expect(mission01.entryPointPath).toBe(path.join(folder, "mission01", "mission.lua"));
            expect(mission01.configs.default.playerTeam).toEqual(["heroes"]);
            expect(Object.keys(mission01.configs.numPlayers)).toEqual(["1", "2"]);
            expect(mission01.configs.numPlayers["2"].playerTeam).toEqual(["heroes", "allies"]);
            expect(mission01.language.en).toBeDefined();
            // A campaign mission's images come from the campaign's shared media, not its own folder.
            expect(mission01.imageUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "mission01_image.png"))}`);
            expect(mission01.backgroundImageUrl).toBe(`bar://${encodeURIComponent(path.join(folder, "shared", "media", "mission01_background.png"))}`);
            // The campaign's shared folder and the mission, never the whole content root.
            expect(mission01.springDataPaths).toEqual([path.join(folder, "shared"), path.join(folder, "mission01")]);
        });

        it("reads scenarios and tutorials with their own compatibility and SpringData folder", async () => {
            const content = await loadSingleplayerContent([official]);
            const [scenario] = content.scenarios;
            const [tutorial] = content.tutorials;

            expect(scenario).toMatchObject({ kind: "scenario", source: "official", rootId: "official" });
            expect(scenario.compatibility).toHaveLength(2);
            expect(scenario.springDataPaths).toEqual([path.join(official.path, "scenarios", "sample-scenario")]);
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
            ["scenarios/missing-files/manifest.json", /entryPoint "not-here.lua" does not exist/],
            ["scenarios/missing-files/manifest.json", /Mission config "noConfig.json" does not exist/],
            ["scenarios/path-traversal/manifest.json", /entryPoint "..\/still-valid\/mission.lua" is outside/],
            ["scenarios/unknown-team/missionConfig.json", /playerTeam names team "nobody"/],
            ["scenarios/unknown-team/missionConfig.json", /teamSettings names team "ghosts"/],
            ["scenarios/bad-team-name/missionConfig.json", /\/alliances must NOT have additional properties \(got "good guys"\)\. .*letters, digits and underscores only/],
            ["scenarios/bad-team-name/missionConfig.json", /\/alliances\/enemies\/1 must match pattern .*"hench;men".*letters, digits and underscores only/],
            ["scenarios/newer-format/manifest.json", /Requires a newer client: format version 99/],
            ["scenarios/no-compatibility/manifest.json", /compatibility is required/],
            ["scenarios/empty-compatibility/manifest.json", /\/compatibility must NOT have fewer than 1 items/],
            ["scenarios/engine-without-games/manifest.json", /\/compatibility\/0\/gameVersions must NOT have fewer than 1 items/],
            ["scenarios/duplicate-engine/manifest.json", /lists engine 2025.04.10 more than once/],
            ["scenarios/rapid-tag/manifest.json", /gameVersions\/0 must match pattern .*"byar:test".*Rapid tags/],
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
});
