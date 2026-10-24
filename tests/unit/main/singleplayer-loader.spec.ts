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
            expect(content.scenarios.map((s) => s.id)).toEqual(["sample-scenario"]);
            expect(content.tutorials.map((t) => t.id)).toEqual(["sample-tutorial"]);
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
});
