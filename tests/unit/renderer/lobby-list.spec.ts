// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope, type Ref } from "vue";
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
const { createLocalLobbyListSource, AUTO_REFRESH_THROTTLE_MS } = await import("@renderer/composables/useLobbyList");
const { reconcileTagsServer } = await import("@renderer/store/custom-lobbies.store");
const { lobbyFilters, matchesFilters, activeFilters, removeDisabledFilters } = await import("@renderer/logic/lobby-list/filters");
const { compareLobbies } = await import("@renderer/logic/lobby-list/sorts");
const { formatRange, lobbyFilterChipDefs, lobbyFilterChips } = await import("@renderer/components/lobbies/list/lobby-filter-chips");

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

const ctx: LobbyMatchContext = { friendIds: new Set(["friend"]), partyMemberIds: new Set(["mate"]), partySize: 1, devMode: false };

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

    it("matches open spots within the range", () => {
        const nearlyFull = lobbyOf("1", { playerCount: 7, maxPlayerCount: 8 });
        const roomy = lobbyOf("2", { playerCount: 2, maxPlayerCount: 8 });
        expect(matchesFilters(nearlyFull, { openSpots: { max: 2 } }, ctx)).toBe(true);
        expect(matchesFilters(roomy, { openSpots: { max: 2 } }, ctx)).toBe(false);
        expect(matchesFilters(nearlyFull, { openSpots: { min: 4 } }, ctx)).toBe(false);
        expect(matchesFilters(roomy, { openSpots: { min: 4 } }, ctx)).toBe(true);
    });

    it("counts an overfull lobby as having no open spots", () => {
        const overfull = lobbyOf("1", { playerCount: 9, maxPlayerCount: 8 });
        expect(matchesFilters(overfull, { openSpots: { max: 0 } }, ctx)).toBe(true);
    });

    it("only matches lobbies with room for the whole party", () => {
        const lobby = lobbyOf("1", { playerCount: 5, maxPlayerCount: 8 });
        expect(matchesFilters(lobby, { fitsParty: true }, { ...ctx, partySize: 3 })).toBe(true);
        expect(matchesFilters(lobby, { fitsParty: true }, { ...ctx, partySize: 4 })).toBe(false);
    });

    it("needs a spot for the user alone when not in a party", () => {
        expect(matchesFilters(lobbyOf("1", { playerCount: 8, maxPlayerCount: 8 }), { fitsParty: true }, ctx)).toBe(false);
        expect(matchesFilters(lobbyOf("1", { playerCount: 7, maxPlayerCount: 8 }), { fitsParty: true }, ctx)).toBe(true);
    });

    it("treats an absent tri-state as no filter", () => {
        const running = lobbyOf("1", { currentBattle: { startedAt: 1 } });
        expect(matchesFilters(running, {}, ctx)).toBe(true);
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

    it("removes values for filters that can't be used, keeping the rest", () => {
        const filters = { engineVersion: "engine-1", tags: ["ranked"], maps: ["Map A"] };
        expect(removeDisabledFilters(filters, false)).toBe(true);
        expect(filters).toEqual({ maps: ["Map A"] });
        expect(removeDisabledFilters(filters, false)).toBe(false);
    });

    it("keeps dev-only filter values in dev mode", () => {
        const filters = { engineVersion: "engine-1", tags: ["ranked"] };
        removeDisabledFilters(filters, true);
        expect(filters).toEqual({ engineVersion: "engine-1" });
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
    describe("by battle duration", () => {
        const long = lobbyOf("a", { currentBattle: { startedAt: 100_000_000 } });
        const short = lobbyOf("b", { currentBattle: { startedAt: 900_000_000 } });
        // Starts in the future by the server's clock.
        const skewed = lobbyOf("d", { currentBattle: { startedAt: 2_000_000_000 } });
        const waiting = lobbyOf("c");
        const ordered = (order: 1 | -1) => [short, waiting, skewed, long].sort((x, y) => compareLobbies(x, y, { key: "battleDuration", order }, now)).map((lobby) => lobby.id);

        it("puts waiting lobbies first when ascending", () => {
            expect(ordered(1)).toEqual(["c", "d", "b", "a"]);
        });

        it("puts the longest running battle first and waiting lobbies last when descending", () => {
            expect(ordered(-1)).toEqual(["a", "b", "d", "c"]);
        });
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

    function create(query = byPlayers, autoRefresh: boolean | Ref<boolean> = false, context: () => LobbyMatchContext = () => ctx) {
        const autoRefreshRef = typeof autoRefresh === "boolean" ? ref(autoRefresh) : autoRefresh;
        return scope.run(() => createLocalLobbyListSource({ query, autoRefresh: autoRefreshRef, context, now: () => 0 }))!;
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

    it("keeps the top row of the page in view when the page size changes", () => {
        reset([1, 2, 3, 4, 5, 6, 7].map((n) => lobbyOf(`l${n}`, { playerCount: n })));
        const source = create();
        source.setPageSize(2);
        source.setPage(4);
        expect(summary(source.rows.value)).toEqual(["l3:live", "l2:live"]);
        source.setPageSize(3);
        expect(source.first.value).toBe(3);
        expect(summary(source.rows.value)).toEqual(["l4:live", "l3:live", "l2:live"]);
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

    it("drops closed and no longer matching lobbies straight away while auto-refresh is on", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 }), lobbyOf("c", { playerCount: 2 })]);
        const source = create(byPlayers, true);
        patch({ b: null, c: { id: "c", playerCount: 0 } });
        expect(summary(source.rows.value)).toEqual(["a:live"]);
        expect(source.totalRecords.value).toBe(1);
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

    it("turns a dimmed lobby back to live in place when it matches again", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ a: { id: "a", playerCount: 0 } });
        patch({ a: { id: "a", playerCount: 2 } });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
    });

    it("leaves a placeholder for an added lobby that closes, without counting it as new", () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const source = create();
        patch({ c: lobbyOf("c", { playerCount: 4 }) });
        patch({ c: null });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live", "c:removed"]);
        expect(source.pendingCount.value).toBe(0);
    });

    it("doesn't count an added lobby that stopped matching as new", () => {
        reset([lobbyOf("a", { playerCount: 1 })]);
        const source = create();
        patch({ c: lobbyOf("c", { playerCount: 4 }) });
        patch({ c: { id: "c", playerCount: 0 } });
        expect(summary(source.rows.value)).toEqual(["a:live", "c:stale"]);
        expect(source.pendingCount.value).toBe(0);
    });

    it("re-orders when auto-refresh is turned on", async () => {
        reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
        const autoRefresh = ref(false);
        const source = create(byPlayers, autoRefresh);
        patch({ a: { id: "a", playerCount: 6 } });
        expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
        autoRefresh.value = true;
        await nextTick();
        expect(summary(source.rows.value)).toEqual(["a:live", "b:live"]);
    });

    it("moves back to the last page when a refresh leaves fewer pages", () => {
        reset([1, 2, 3, 4, 5, 6, 7].map((n) => lobbyOf(`l${n}`, { playerCount: n })));
        const source = create();
        source.setPageSize(2);
        source.setPage(6);
        expect(summary(source.rows.value)).toEqual(["l1:live"]);
        patch({ l1: null, l2: null, l3: null, l4: null });
        source.refresh();
        expect(source.first.value).toBe(2);
        expect(summary(source.rows.value)).toEqual(["l5:live"]);
    });

    it("re-checks the filters when the user's context changes", () => {
        reset([lobbyOf("a", { playerCount: 6, maxPlayerCount: 8 }), lobbyOf("b", { playerCount: 2, maxPlayerCount: 8 })]);
        const partySize = ref(1);
        const source = create({ filters: { fitsParty: true }, sort: { key: "playerCount", order: -1 } }, false, () => ({ ...ctx, partySize: partySize.value }));
        expect(summary(source.rows.value)).toEqual(["a:live", "b:live"]);
        partySize.value = 3;
        expect(summary(source.rows.value)).toEqual(["a:stale", "b:live"]);
    });

    describe("with auto-refresh on", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("re-orders at most once per throttle period", async () => {
            reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 }), lobbyOf("c", { playerCount: 2 })]);
            const source = create(byPlayers, true);
            patch({ a: { id: "a", playerCount: 6 } });
            await vi.advanceTimersByTimeAsync(0);
            expect(summary(source.rows.value)).toEqual(["a:live", "b:live", "c:live"]);
            patch({ c: { id: "c", playerCount: 9 } });
            await vi.advanceTimersByTimeAsync(AUTO_REFRESH_THROTTLE_MS / 2);
            expect(summary(source.rows.value)).toEqual(["a:live", "b:live", "c:live"]);
            await vi.advanceTimersByTimeAsync(AUTO_REFRESH_THROTTLE_MS);
            expect(summary(source.rows.value)).toEqual(["c:live", "a:live", "b:live"]);
        });

        it("holds every row in place, closed and no longer matching ones too, until the hold ends", async () => {
            reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 }), lobbyOf("c", { playerCount: 2 })]);
            const source = create(byPlayers, true);
            source.holdOrder(500);
            patch({ a: { id: "a", playerCount: 6 }, b: null, c: { id: "c", playerCount: 0 }, d: lobbyOf("d", { playerCount: 4 }) });
            await vi.advanceTimersByTimeAsync(400);
            expect(summary(source.rows.value)).toEqual(["b:removed", "c:stale", "a:live"]);
            await vi.advanceTimersByTimeAsync(100);
            expect(summary(source.rows.value)).toEqual(["a:live", "d:live"]);
        });

        it("restarts the hold when held again", async () => {
            reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
            const source = create(byPlayers, true);
            source.holdOrder(500);
            patch({ a: { id: "a", playerCount: 6 } });
            await vi.advanceTimersByTimeAsync(400);
            source.holdOrder(500);
            await vi.advanceTimersByTimeAsync(400);
            expect(summary(source.rows.value)).toEqual(["b:live", "a:live"]);
            await vi.advanceTimersByTimeAsync(100);
            expect(summary(source.rows.value)).toEqual(["a:live", "b:live"]);
        });

        it("ends the hold on a refresh", () => {
            reset([lobbyOf("a", { playerCount: 1 }), lobbyOf("b", { playerCount: 3 })]);
            const source = create(byPlayers, true);
            source.holdOrder(500);
            patch({ a: { id: "a", playerCount: 6 } });
            source.refresh();
            expect(summary(source.rows.value)).toEqual(["a:live", "b:live"]);
        });
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
        const settings = { query: { filters: { tags: ["ranked"], maps: ["Map A"] }, sort: { key: "name", order: 1 } } as LobbyListQuery, tagsServer: "old" };
        reconcileTagsServer(settings, "new");
        expect(settings.query.filters).toEqual({ maps: ["Map A"] });
        expect(settings.tagsServer).toBe("new");
    });

    it("keeps tags chosen on this server", () => {
        const settings = { query: { filters: { tags: ["ranked"] }, sort: { key: "name", order: 1 } } as LobbyListQuery, tagsServer: "same" };
        reconcileTagsServer(settings, "same");
        expect(settings.query.filters.tags).toEqual(["ranked"]);
    });
});

describe("filter chips", () => {
    const t = ((key: string, params?: unknown) => (params === undefined ? key : `${key} ${JSON.stringify(params)}`)) as never;
    const chipCtx = { t, mapDisplayName: (name: string) => name, availableTags: new Set(["ranked"]) };

    it("gives each active filter its chips, and each chip removes only its own part", () => {
        const filters = { maps: ["Map A"], players: { min: 1 }, inProgress: false };
        const chips = lobbyFilterChips(filters, false, chipCtx);
        expect(chips.map((chip) => chip.id)).toEqual(["maps", "players", "inProgress"]);
        chips[1].remove(filters);
        expect(filters).toEqual({ maps: ["Map A"], inProgress: false });
    });

    // Tags are switched off until Tachyon sends them, so their chips are built directly here.
    it("removes one tag at a time, and the filter with the last one", () => {
        const filters: { tags?: string[] } = { tags: ["ranked", "casual"] };
        const [ranked, casual] = lobbyFilterChipDefs.tags.chips(filters.tags!, chipCtx);
        expect(casual.warning).toBe(true);
        ranked.remove(filters);
        expect(filters).toEqual({ tags: ["casual"] });
        casual.remove(filters);
        expect(filters).toEqual({});
    });

    it("formats ranges by which ends are set", () => {
        expect(formatRange({ min: 2, max: 2 }, t)).toBe("2");
        expect(formatRange({ min: 1, max: 4 }, t)).toBe('lobby.multiplayer.custom.filters.range.between {"min":1,"max":4}');
        expect(formatRange({ min: 1 }, t)).toBe('lobby.multiplayer.custom.filters.range.atLeast {"min":1}');
        expect(formatRange({ max: 4 }, t)).toBe('lobby.multiplayer.custom.filters.range.atMost {"max":4}');
    });
});
