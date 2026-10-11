// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import type { LobbyOverview } from "tachyon-protocol/types";
import type { LobbyListQuery } from "@shared/lobby-list-query";
import type { LobbyListEntry, LobbyListRow, LobbyMatchContext } from "@renderer/model/lobby-list";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const handlers = new Map<string, (data: unknown) => void>();

Object.assign(window.tachyon, {
    requestStructured: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: (command: string, callback: (data: unknown) => void) => void handlers.set(command, callback),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { onWentOffline } = await import("@renderer/utils/offline-signal");
const { createLocalLobbyListSource, reconcileTagsServer } = await import("@renderer/composables/useLobbyList");
const { lobbyFilters, matchesFilters, activeFilters } = await import("@renderer/components/lobbies/list/lobby-filters");
const { compareLobbies } = await import("@renderer/components/lobbies/list/lobby-sorts");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

function lobbyOf(id: string, overrides: Partial<LobbyListEntry> = {}): LobbyListEntry {
    return {
        id,
        name: `Lobby ${id}`,
        playerCount: 2,
        maxPlayerCount: 8,
        mapName: "Map A",
        engineVersion: "engine-1",
        gameVersion: "game-1",
        currentBattle: null,
        ...overrides,
    };
}

const ctx: LobbyMatchContext = { friendIds: new Set(["friend"]), partyMemberIds: new Set(["mate"]), devMode: false };

function filterDef(key: string) {
    const def = lobbyFilters.find((filter) => filter.key === key);
    if (!def) throw new Error(`no filter ${key}`);
    return def;
}

describe("lobby filters", () => {
    it("matches the title case-insensitively", () => {
        expect(matchesFilters(lobbyOf("1", { name: "Big Team Game" }), { title: "team" }, ctx)).toBe(true);
        expect(matchesFilters(lobbyOf("1", { name: "Big Team Game" }), { title: "duel" }, ctx)).toBe(false);
    });

    it("matches any of the chosen maps", () => {
        expect(matchesFilters(lobbyOf("1", { mapName: "Map B" }), { maps: ["Map A", "Map B"] }, ctx)).toBe(true);
        expect(matchesFilters(lobbyOf("1", { mapName: "Map C" }), { maps: ["Map A", "Map B"] }, ctx)).toBe(false);
    });

    it("matches player counts within the range, inclusive", () => {
        expect(matchesFilters(lobbyOf("1", { playerCount: 0 }), { players: { min: 1 } }, ctx)).toBe(false);
        expect(matchesFilters(lobbyOf("1", { playerCount: 1 }), { players: { min: 1 } }, ctx)).toBe(true);
        expect(matchesFilters(lobbyOf("1", { playerCount: 9 }), { players: { min: 1, max: 8 } }, ctx)).toBe(false);
    });

    it("treats null and absent tri-states as no filter", () => {
        const running = lobbyOf("1", { currentBattle: { startedAt: 1 } });
        expect(matchesFilters(running, { inProgress: null }, ctx)).toBe(true);
        expect(matchesFilters(running, { inProgress: true }, ctx)).toBe(true);
        expect(matchesFilters(running, { inProgress: false }, ctx)).toBe(false);
    });

    it("only applies the dev-only version filters in dev mode", () => {
        const lobby = lobbyOf("1", { engineVersion: "engine-1" });
        expect(matchesFilters(lobby, { engineVersion: "engine-2" }, ctx)).toBe(true);
        expect(matchesFilters(lobby, { engineVersion: "engine-2" }, { ...ctx, devMode: true })).toBe(false);
    });

    it("ignores filters waiting on Tachyon while they are switched off", () => {
        const filters = { passworded: true, bossMode: true, tags: ["x"], allyTeams: { min: 4 }, hasFriend: true, hasPartyMember: true };
        expect(activeFilters(filters, true)).toHaveLength(0);
        expect(matchesFilters(lobbyOf("1", { passworded: false }), filters, ctx)).toBe(true);
    });

    // Turning one of these on before the server sends its field must not hide the whole list.
    it.each([
        ["passworded", true],
        ["bossMode", true],
        ["tags", ["ranked"]],
        ["allyTeams", { min: 3 }],
        ["hasFriend", true],
        ["hasPartyMember", true],
    ])("lets lobbies without the field through the %s filter", (key, value) => {
        expect(filterDef(key).match(lobbyOf("1"), value as never, ctx)).toBe(true);
    });

    it("matches the Tachyon fields once they arrive", () => {
        expect(filterDef("passworded").match(lobbyOf("1", { passworded: false }), true as never, ctx)).toBe(false);
        expect(filterDef("tags").match(lobbyOf("1", { tags: ["casual"] }), ["ranked"] as never, ctx)).toBe(false);
        expect(filterDef("tags").match(lobbyOf("1", { tags: ["casual", "ranked"] }), ["ranked"] as never, ctx)).toBe(true);
        expect(filterDef("allyTeams").match(lobbyOf("1", { allyTeamCount: 2 }), { min: 3 } as never, ctx)).toBe(false);
        expect(filterDef("hasFriend").match(lobbyOf("1", { memberIds: ["stranger"] }), true as never, ctx)).toBe(false);
        expect(filterDef("hasFriend").match(lobbyOf("1", { memberIds: ["stranger", "friend"] }), true as never, ctx)).toBe(true);
        expect(filterDef("hasPartyMember").match(lobbyOf("1", { memberIds: ["mate"] }), true as never, ctx)).toBe(true);
    });
});

describe("lobby sorts", () => {
    const now = 1_000_000;

    it("orders by the chosen field in either direction", () => {
        const few = lobbyOf("a", { playerCount: 1 });
        const many = lobbyOf("b", { playerCount: 5 });
        expect(compareLobbies(few, many, { key: "playerCount", order: 1 }, now)).toBeLessThan(0);
        expect(compareLobbies(few, many, { key: "playerCount", order: -1 }, now)).toBeGreaterThan(0);
    });

    it("counts open spots", () => {
        const roomy = lobbyOf("a", { playerCount: 1, maxPlayerCount: 16 });
        const tight = lobbyOf("b", { playerCount: 7, maxPlayerCount: 8 });
        expect(compareLobbies(roomy, tight, { key: "openSpots", order: -1 }, now)).toBeLessThan(0);
    });

    it("compares titles naturally", () => {
        expect(compareLobbies(lobbyOf("a", { name: "Game 2" }), lobbyOf("b", { name: "Game 10" }), { key: "name", order: 1 }, now)).toBeLessThan(0);
    });

    it("breaks ties by title and then id", () => {
        const sort = { key: "playerCount", order: -1 } as const;
        expect(compareLobbies(lobbyOf("b", { name: "Alpha" }), lobbyOf("a", { name: "Beta" }), sort, now)).toBeLessThan(0);
        expect(compareLobbies(lobbyOf("a", { name: "Same" }), lobbyOf("b", { name: "Same" }), sort, now)).toBeLessThan(0);
    });

    // startedAt is in microseconds.
    it("puts the longest running battle first when descending, and lobbies without one last either way", () => {
        const long = lobbyOf("a", { currentBattle: { startedAt: 100_000_000 } });
        const short = lobbyOf("b", { currentBattle: { startedAt: 900_000_000 } });
        const waiting = lobbyOf("c");
        for (const order of [1, -1] as const) {
            expect(compareLobbies(waiting, long, { key: "battleDuration", order }, now)).toBeGreaterThan(0);
        }
        expect(compareLobbies(long, short, { key: "battleDuration", order: -1 }, now)).toBeLessThan(0);
    });
});

describe("local lobby list source", () => {
    let scope: EffectScope;

    beforeAll(async () => {
        await initLobbyStore();
    });

    beforeEach(() => {
        scope = effectScope();
    });

    afterEach(() => {
        scope.stop();
    });

    const byPlayers: LobbyListQuery = { filters: { players: { min: 1 } }, sort: { key: "playerCount", order: -1 } };

    function reset(lobbies: LobbyOverview[]) {
        emit("lobby/listReset", { lobbies: Object.fromEntries(lobbies.map((lobby) => [lobby.id, lobby])) });
    }

    function patch(lobbies: Record<string, Partial<LobbyOverview> | null>) {
        emit("lobby/listUpdated", { lobbies });
    }

    function create(query = byPlayers, autoRefresh = false) {
        return scope.run(() => createLocalLobbyListSource({ query, autoRefresh: ref(autoRefresh), context: () => ctx, now: () => 0 }))!;
    }

    const summary = (rows: LobbyListRow[]) => rows.map((row) => `${row.id}:${row.state}`);

    it("orders the list when created", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 }), lobbyOf("c", { playerCount: 0 })]);
        const source = create();
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
    });

    it("holds the order while player counts change", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ a: { id: "a", playerCount: 6 } });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
        expect(source.rows.value[1].state === "live" && source.rows.value[1].lobby.playerCount).toBe(6);
    });

    it("adds newly matching lobbies to the bottom", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ c: lobbyOf("c", { playerCount: 8 }) });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live", "c:live"]);
        expect(source.pendingCount.value).toBe(1);
    });

    it("leaves a placeholder where a closed lobby was", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ b: null });
        expect(summary(source.rows.value)).toEqual(["b:removed", "a:live"]);
    });

    it("dims a lobby that stops matching instead of dropping it", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ a: { id: "a", playerCount: 0 } });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:stale"]);
    });

    it("re-orders and clears placeholders on refresh", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 }), lobbyOf("c", { playerCount: 2 })]);
        const source = create();
        patch({ a: { id: "a", playerCount: 6 }, b: null, c: { id: "c", playerCount: 0 }, d: lobbyOf("d", { playerCount: 4 }) });
        source.refresh();
        expect(summary(source.rows.value)).toEqual(["a:live", "d:live"]);
        expect(source.pendingCount.value).toBe(0);
    });

    it("re-orders from the first page when the query changes", () => {
        reset([lobbyOf("a", { playerCount: 1, name: "Zulu" }), lobbyOf("b", { playerCount: 3, name: "Alpha" })]);
        const source = create();
        source.setQuery({ filters: {}, sort: { key: "name", order: 1 } });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
        expect(source.first.value).toBe(0);
    });

    it("re-orders on every change while auto-refresh is on", async () => {
        vi.useFakeTimers();
        try {
            reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
            const source = create(byPlayers, true);
            patch({ a: { id: "a", playerCount: 6 } });
            await vi.runAllTimersAsync();
            expect(summary(source.rows.value)).toEqual(["a:live", "b:live"]);
        } finally {
            vi.useRealTimers();
        }
    });

    it("starts over when the server resets the list", async () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        reset([lobbyOf("x", { playerCount: 2 })]);
        await nextTick();
        expect(summary(source.rows.value)).toEqual(["x:live"]);
        expect(source.pendingCount.value).toBe(0);
    });

    // Going offline is also what a server switch does, by way of logging out.
    it("is left empty, without placeholders, after going offline", async () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        onWentOffline.dispatch();
        await nextTick();
        expect(lobbyStore.lobbies).toEqual({});
        expect(source.rows.value).toEqual([]);
        expect(source.totalRecords.value).toBe(0);
        expect(source.pendingCount.value).toBe(0);
    });

    it("collects the tags the server is using", () => {
        reset([lobbyOf("a", { tags: ["ranked", "casual"] } as never), lobbyOf("b", { tags: ["casual"] } as never)]);
        const source = create({ filters: {}, sort: { key: "name", order: 1 } });
        expect(source.availableTags.value).toEqual(["casual", "ranked"]);
        patch({ c: { ...lobbyOf("c"), tags: ["newbie"] } as never });
        expect(source.availableTags.value).toEqual(["casual", "newbie", "ranked"]);
    });
});

describe("tags across servers", () => {
    it("drops tags chosen on another server", () => {
        const settings = { customLobbiesQuery: { filters: { tags: ["ranked"], maps: ["Map A"] }, sort: { key: "name", order: 1 } } as LobbyListQuery, customLobbiesTagsServer: "old" };
        reconcileTagsServer(settings, "new");
        expect(settings.customLobbiesQuery.filters).toEqual({ maps: ["Map A"] });
        expect(settings.customLobbiesTagsServer).toBe("new");
    });

    it("keeps tags chosen on this server", () => {
        const settings = { customLobbiesQuery: { filters: { tags: ["ranked"] }, sort: { key: "name", order: 1 } } as LobbyListQuery, customLobbiesTagsServer: "same" };
        reconcileTagsServer(settings, "same");
        expect(settings.customLobbiesQuery.filters.tags).toEqual(["ranked"]);
    });
});
