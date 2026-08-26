// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

const ONLINE_REPLAYS_API_URL = "https://api.bar-rts.com/replays";
import { getOnlineReplay, searchOnlineReplaysByPlayer } from "@main/replays/online-replays";

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

vi.mock("@main/services/config.service", () => {
    return {
        configService: {
            getConfig: vi.fn(() => ({
                onlineReplaysApiUrl: ONLINE_REPLAYS_API_URL,
            })),
        },
    };
});

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

        const result = await searchOnlineReplaysByPlayer("Naughty", 10);

        const [url] = fetchMock.mock.calls[0];
        expect(url).toContain(`${ONLINE_REPLAYS_API_URL}?`);
        expect(url).toContain("players=Naughty");
        expect(url).toContain("limit=10");
        expect(result).toEqual({
            status: "success",
            data: [
                {
                    id: "abcdef",
                    startTime: "2026-07-27T22:06:02.000Z",
                    durationMs: 1351267,
                    mapName: "All That Glitters v2.2.3",
                    allyTeamSizes: [1, 2],
                    hasBots: true,
                },
            ],
        });
    });

    // A failure has to be distinguishable from a player with no recent games, otherwise the modal
    // tells the reporter something about the player that it does not actually know.
    it("reports a failure rather than an empty result when the replay API fails", async () => {
        mockFetch({ ok: false });

        expect(await searchOnlineReplaysByPlayer("Naughty", 10)).toMatchObject({
            status: "failed",
            reason: "replay_search_failed",
            details: "500 Internal Server Error",
        });
    });

    it("does not let a rejection escape to the renderer", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.bar-rts.com")));

        expect(await searchOnlineReplaysByPlayer("Naughty", 10)).toMatchObject({
            status: "failed",
            reason: "replay_search_failed",
            details: "getaddrinfo ENOTFOUND api.bar-rts.com",
        });
    });
});

describe("getOnlineReplay", () => {
    it("keeps the teams, the spectators and the server match id", async () => {
        mockFetch({ ok: true, body: apiReplay });

        const result = await getOnlineReplay("abcdef");

        expect(result.status).toBe("success");
        if (result.status !== "success") return;

        expect(result.data.serverMatchId).toBe("10453109");
        expect(result.data.preset).toBe("team");
        expect(result.data.players).toEqual([
            { name: "Naughty", userId: 1234, allyTeamId: 0, winningTeam: true },
            { name: "SomeoneElse", userId: 5678, allyTeamId: 1, winningTeam: false },
            { name: "NoAccount", userId: null, allyTeamId: 1, winningTeam: false },
        ]);
        expect(result.data.spectators).toEqual([{ name: "Watcher", userId: 9012 }]);
    });

    it("reports a failure when the replay API fails", async () => {
        mockFetch({ ok: false });

        expect(await getOnlineReplay("abcdef")).toMatchObject({ status: "failed", reason: "replay_fetch_failed" });
    });
});
