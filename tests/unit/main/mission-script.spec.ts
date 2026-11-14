// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { missionLuaPath } from "@main/content/singleplayer/mission-archive";
import type { MissionInputs } from "@main/content/singleplayer/mission-launch";
import { missionStartScript } from "@main/content/singleplayer/mission-script";
import type { MissionConfig } from "@shared/content/schema/mission-config";
import { decodeModoptionValue } from "@shared/startbox-modoptions";

const fixtures = path.resolve(__dirname, "../../fixtures");
const readConfig = (...parts: string[]): MissionConfig => JSON.parse(fs.readFileSync(path.join(fixtures, ...parts), "utf8"));
const OUTPOST_STRIKE = readConfig("content-sdz", "scenarios", "outpost-strike", "missionConfig.json");
const MISSION01 = readConfig("content", "campaigns", "sample-campaign", "mission01", "missionConfig.json");

const script = (config: MissionConfig, entryPoint = "scenarios/outpost-strike/mission.lua", inputs: MissionInputs = { difficulty: "Story" }) =>
    missionStartScript({ archiveName: "bar-scenario-outpost-strike 1.0", mapName: "Quicksilver Remake 1.24", config, entryPoint, inputs, playerName: "Commander" });
const missionOptionsOf = (text: string) => decodeModoptionValue(/missionoptions=([^;]*);/.exec(text)?.[1]);

describe("missionLuaPath", () => {
    it("mirrors the content folder inside the archive", () => {
        expect(missionLuaPath("scenario", "outpost-strike")).toBe("scenarios/outpost-strike/mission.lua");
        expect(missionLuaPath("tutorial", "movement")).toBe("tutorials/movement/mission.lua");
        expect(missionLuaPath("campaign", "sample-campaign", "mission01")).toBe("campaigns/sample-campaign/mission01/mission.lua");
    });
});

describe("missionStartScript", () => {
    it("writes the outpost-strike example's start script", async () => {
        const text = await script(OUTPOST_STRIKE);

        expect(text.replace(/missionoptions=[^;]*;/, "missionoptions=<payload>;")).toBe(`[game] {
    gametype=bar-scenario-outpost-strike 1.0;
    mapname=Quicksilver Remake 1.24;
    myplayername=Commander;
    ishost=1;
    startpostype=3;
    [modoptions] {
        deathmode=neverend;
        missionoptions=<payload>;
    }
    [allyteam0] {
        name=players;
        numallies=0;
    }
    [allyteam1] {
        name=enemies;
        numallies=0;
    }
    [team0] {
        name=player;
        allyteam=0;
        teamleader=0;
        side=Armada;
        rgbcolor=0.1 0.45 0.9;
        startposx=5648;
        startposz=5175;
    }
    [team1] {
        name=enemy;
        allyteam=1;
        teamleader=0;
        side=Cortex;
        rgbcolor=0.85 0.15 0.1;
        startposx=2107;
        startposz=2466;
    }
    [player0] {
        name=Commander;
        team=0;
    }
}`);
    });

    // The game decodes it with ModoptionPayload: base64url of zlib-compressed JSON.
    it("passes the Mission API the entry point and difficulty, as the game decodes it", async () => {
        expect(await missionOptionsOf(await script(OUTPOST_STRIKE, "scenarios/outpost-strike/mission.lua", { difficulty: "Hard" }))).toEqual({
            entryPoint: "scenarios/outpost-strike/mission.lua",
            difficulty: "Hard",
        });
    });

    it("passes a campaign mission the campaign's variables", async () => {
        const variables = { mission01_choice: "left", mission01_score: 1200, mission01_spared: true };

        expect(await missionOptionsOf(await script(MISSION01, "campaigns/sample-campaign/mission01/mission.lua", { difficulty: "Easy", variables }))).toEqual({
            entryPoint: "campaigns/sample-campaign/mission01/mission.lua",
            difficulty: "Easy",
            variables,
        });
    });

    it("writes alliances, start boxes, restrictions, options and a Lua AI from a campaign mission's config", async () => {
        const text = await script(MISSION01);

        expect(text).toContain("[allyteam0] {\n        name=goodGuys;\n        numallies=1;\n        ally0=2;\n        startrecttop=0;");
        expect(text).toContain("[allyteam2] {\n        name=neutral;\n        numallies=1;\n        ally0=0;\n    }");
        expect(text).toContain("[team4] {\n        name=civilians;\n        allyteam=2;\n        teamleader=0;\n    }");
        expect(text).toContain("numrestrictions=2;\n    [restrict] {\n        unit0=armsilo;\n        limit0=0;\n        unit1=corjugg;\n        limit1=1;\n    }");
        expect(text).toContain("[mapoptions] {\n        map_option_key=mapOptionValue;\n    }");
        expect(text).toContain("[player0] {\n        name=Commander;\n        team=0;\n    }");
        expect(text).toContain("[ai0] {\n        team=2;\n        shortname=SampleAI;\n        host=0;\n        name=mainBadGuy;\n    }");
    });

    it("puts the player on the first player team, wherever it is", async () => {
        const text = await script({ ...OUTPOST_STRIKE, playerTeam: ["enemy"] });

        expect(text).toContain("[player0] {\n        name=Commander;\n        team=1;\n    }");
    });

    // The Mission API fails without Gaia's team.
    it.each([0, false, "0"])("never turns Gaia off, even when the config sets luagaia to %o", async (value) => {
        expect(await script({ ...OUTPOST_STRIKE, modOptions: { ...OUTPOST_STRIKE.modOptions, luagaia: value } })).not.toContain("luagaia");
    });

    it("leaves startpostype to the engine when the config doesn't name one", async () => {
        expect(await script({ ...OUTPOST_STRIKE, startPosType: undefined })).not.toContain("startpostype");
    });
});
