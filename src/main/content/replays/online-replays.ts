// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { IpcResult } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

const log = logger("online-replays.ts");

const ONLINE_REPLAYS_API_URL = "https://api.bar-rts.com/replays";

export type OnlineReplayOverview = {
    id: string;
    startTime: string;
    durationMs: number;
    mapName: string;
    allyTeamSizes: number[];
    hasBots: boolean;
};

export type OnlineReplayPlayer = {
    name: string;
    userId: number | null;
    allyTeamId: number;
    winningTeam: boolean;
};

export type OnlineReplayDetails = OnlineReplayOverview & {
    preset: string | null;
    // Teiserver stores this against the match its moderation reports point at.
    serverMatchId: string | null;
    players: OnlineReplayPlayer[];
    spectators: Array<{ name: string; userId: number | null }>;
};

type ApiPlayer = { name?: string; userId?: number };
type ApiAllyTeam = { allyTeamId?: number; winningTeam?: boolean; Players?: ApiPlayer[]; AIs?: unknown[] };
type ApiReplay = {
    id?: string;
    startTime?: string;
    durationMs?: number;
    preset?: string;
    Map?: { scriptName?: string; fileName?: string };
    AllyTeams?: ApiAllyTeam[];
    Spectators?: ApiPlayer[];
    hostSettings?: Record<string, string>;
};

function toOverview(replay: ApiReplay): OnlineReplayOverview {
    const allyTeams = replay.AllyTeams ?? [];

    return {
        id: replay.id ?? "",
        startTime: replay.startTime ?? "",
        durationMs: replay.durationMs ?? 0,
        mapName: replay.Map?.scriptName ?? replay.Map?.fileName ?? "",
        allyTeamSizes: allyTeams.map((allyTeam) => allyTeam.Players?.length ?? 0),
        hasBots: allyTeams.some((allyTeam) => (allyTeam.AIs?.length ?? 0) > 0),
    };
}

function toDetails(replay: ApiReplay): OnlineReplayDetails {
    const allyTeams = replay.AllyTeams ?? [];

    return {
        ...toOverview(replay),
        preset: replay.preset ?? null,
        serverMatchId: replay.hostSettings?.server_match_id ?? null,
        players: allyTeams.flatMap((allyTeam, index) =>
            (allyTeam.Players ?? []).map((player) => ({
                name: player.name ?? "",
                userId: player.userId ?? null,
                allyTeamId: allyTeam.allyTeamId ?? index,
                winningTeam: allyTeam.winningTeam ?? false,
            }))
        ),
        spectators: (replay.Spectators ?? []).map((spectator) => ({
            name: spectator.name ?? "",
            userId: spectator.userId ?? null,
        })),
    };
}

function failed(reason: string, error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    log.error(`${reason}: ${details}`);

    return { status: "failed", reason, details } as const;
}

async function fetchJson(url: string) {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
}

export async function searchOnlineReplaysByPlayer(username: string, limit: number): Promise<IpcResult<OnlineReplayOverview[]>> {
    const url = `${ONLINE_REPLAYS_API_URL}?${new URLSearchParams({ players: username, limit: limit.toString(), page: "1" })}`;

    try {
        const body = (await fetchJson(url)) as { data?: ApiReplay[] };

        return { status: "success", data: (body.data ?? []).map(toOverview).filter((replay) => replay.id) };
    } catch (error) {
        return failed("replay_search_failed", error);
    }
}

export async function getOnlineReplay(replayId: string): Promise<IpcResult<OnlineReplayDetails>> {
    try {
        const body = (await fetchJson(`${ONLINE_REPLAYS_API_URL}/${encodeURIComponent(replayId)}`)) as ApiReplay;

        return { status: "success", data: toDetails(body) };
    } catch (error) {
        return failed("replay_fetch_failed", error);
    }
}
