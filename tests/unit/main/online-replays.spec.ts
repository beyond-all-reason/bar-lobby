// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import { getOnlineReplay, searchOnlineReplaysByPlayer } from "@main/content/replays/online-replays";

const apiReplay = {
    id: "abcdef",
    startTime: "2026-07-27T22:06:02.000Z",
    durationMs: 1351267,
    preset: "team",
    Map: { scriptName: "All That Glitters v2.2.3", fileName: "all_that_glitters_v2.2.3" },
    hostSettings: { server_match_id: "10453109" },
    AllyTeams: [
        {
            allyTeamId: 0,
            winningTeam: true,
            Players: [{ name: "Naughty", userId: 1234 }],
            AIs: [],
        },
        {
            allyTeamId: 1,
            winningTeam: false,
            Players: [{ name: "SomeoneElse", userId: 5678 }, { name: "NoAccount" }],
            AIs: [{ shortName: "BARb" }],
        },
    ],
    Spectators: [{ name: "Watcher", userId: 9012 }],
};

function mockFetch(response: { ok: boolean; body?: unknown }) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: response.ok,
        status: response.ok ? 200 : 500,
        statusText: response.ok ? "OK" : "Internal Server Error",
        json: async () => response.body,
    });
    vi.stubGlobal("fetch", fetchMock);

    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("searchOnlineReplaysByPlayer", () => {
    it("queries the replay API for that player and summarises the matches", async () => {
        const fetchMock = mockFetch({ ok: true, body: { data: [apiReplay] } });

        const replays = await searchOnlineReplaysByPlayer("Naughty", 10);

        const [url] = fetchMock.mock.calls[0];
        expect(url).toContain("https://api.bar-rts.com/replays?");
        expect(url).toContain("players=Naughty");
        expect(url).toContain("limit=10");
        expect(replays).toEqual([
            {
                id: "abcdef",
                startTime: "2026-07-27T22:06:02.000Z",
                durationMs: 1351267,
                mapName: "All That Glitters v2.2.3",
                allyTeamSizes: [1, 2],
                hasBots: true,
            },
        ]);
    });

    it("returns nothing when the replay API fails", async () => {
        mockFetch({ ok: false });

        expect(await searchOnlineReplaysByPlayer("Naughty", 10)).toEqual([]);
    });
});

describe("getOnlineReplay", () => {
    it("keeps the teams, the spectators and the server match id", async () => {
        mockFetch({ ok: true, body: apiReplay });

        const replay = await getOnlineReplay("abcdef");

        expect(replay?.serverMatchId).toBe("10453109");
        expect(replay?.preset).toBe("team");
        expect(replay?.players).toEqual([
            { name: "Naughty", userId: 1234, allyTeamId: 0, winningTeam: true },
            { name: "SomeoneElse", userId: 5678, allyTeamId: 1, winningTeam: false },
            { name: "NoAccount", userId: null, allyTeamId: 1, winningTeam: false },
        ]);
        expect(replay?.spectators).toEqual([{ name: "Watcher", userId: 9012 }]);
    });

    it("returns nothing when the replay API fails", async () => {
        mockFetch({ ok: false });

        expect(await getOnlineReplay("abcdef")).toBeNull();
    });
});
