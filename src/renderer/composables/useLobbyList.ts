// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, onScopeDispose, readonly, ref, shallowRef, watch, type ComputedRef, type Ref } from "vue";
import { watchThrottled } from "@vueuse/core";
import type { UserId } from "tachyon-protocol/types";
import { cloneLobbyListQuery, type LobbyListQuery } from "@shared/lobby-list-query";
import type { LobbyListEntry, LobbyListRow, LobbyMatchContext } from "@renderer/model/lobby-list";
import { matchesFilters } from "@renderer/logic/lobby-list/filters";
import { compareLobbies } from "@renderer/logic/lobby-list/sorts";
import { lobbyStore } from "@renderer/store/lobby.store";
import { me } from "@renderer/store/me.store";
import { partyStore } from "@renderer/store/party.store";
import { settingsStore } from "@renderer/store/settings.store";

export const AUTO_REFRESH_THROTTLE_MS = 2000;

export const DOUBLE_CLICK_HOLD_MS = 550;

/** Used until the page measures how many rows fit. */
export const LOBBY_LIST_PAGE_SIZE = 16;

/** The local source filters the pushed list; a server-side source could fill the same refs. */
export interface LobbyListSource {
    rows: ComputedRef<LobbyListRow[]>;
    totalRecords: ComputedRef<number>;
    first: Ref<number>;
    pageSize: Readonly<Ref<number>>;
    pendingCount: ComputedRef<number>;
    availableTags: ComputedRef<string[]>;
    availableEngineVersions: ComputedRef<string[]>;
    availableGameVersions: ComputedRef<string[]>;
    setQuery(query: LobbyListQuery): void;
    setPage(first: number): void;
    setPageSize(size: number): void;
    refresh(): void;
    holdOrder(ms: number): void;
}

export type LocalLobbyListSourceOptions = {
    query: LobbyListQuery;
    autoRefresh: Ref<boolean>;
    context: () => LobbyMatchContext;
    now?: () => number;
};

function sortedUnion(values: Iterable<string | undefined>): string[] {
    const set = new Set<string>();
    for (const value of values) if (value) set.add(value);
    return [...set].sort();
}

/**
 * Holds the order between refreshes so rows don't jump: non-matching lobbies stay (stale), closed
 * ones leave a placeholder (removed), and new matches are appended.
 */
export function createLocalLobbyListSource(options: LocalLobbyListSourceOptions): LobbyListSource {
    const now = options.now ?? Date.now;
    const query = shallowRef<LobbyListQuery>(cloneLobbyListQuery(options.query));
    const orderedIds = shallowRef<string[]>([]);
    const appendedIds = shallowRef<string[]>([]);
    const first = ref(0);
    const pageSize = ref(LOBBY_LIST_PAGE_SIZE);
    // Row ids when the hold started; null when not held.
    const heldIds = shallowRef<string[] | null>(null);
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const lobbies = () => Object.values(lobbyStore.lobbies) as LobbyListEntry[];

    const matchingIds = computed(() => {
        const ctx = options.context();
        return new Set(
            lobbies()
                .filter((lobby) => matchesFilters(lobby, query.value.filters, ctx))
                .map((lobby) => lobby.id)
        );
    });

    function endHold() {
        clearTimeout(holdTimer);
        heldIds.value = null;
    }

    function refresh() {
        endHold();
        const ctx = options.context();
        const at = now();
        orderedIds.value = lobbies()
            .filter((lobby) => matchesFilters(lobby, query.value.filters, ctx))
            .sort((a, b) => compareLobbies(a, b, query.value.sort, at))
            .map((lobby) => lobby.id);
        appendedIds.value = [];
        first.value = Math.min(first.value, Math.max(0, Math.floor((orderedIds.value.length - 1) / pageSize.value) * pageSize.value));
    }

    watch(
        matchingIds,
        (ids) => {
            const known = new Set([...orderedIds.value, ...appendedIds.value]);
            const fresh = [...ids].filter((id) => !known.has(id));
            if (fresh.length > 0) {
                appendedIds.value = [...appendedIds.value, ...fresh];
            }
        },
        { flush: "sync" }
    );

    // After a reset, going offline, or a server switch, old ids would all read as closed.
    watch(
        () => lobbyStore.listGeneration,
        () => {
            first.value = 0;
            refresh();
        }
    );

    watchThrottled(
        () => lobbyStore.lobbies,
        () => {
            if (options.autoRefresh.value && !heldIds.value) refresh();
        },
        { deep: true, throttle: AUTO_REFRESH_THROTTLE_MS, trailing: true }
    );

    watch(options.autoRefresh, (enabled) => {
        if (enabled) refresh();
        else endHold();
    });

    onScopeDispose(() => clearTimeout(holdTimer));

    function holdOrder(ms: number) {
        if (!heldIds.value) heldIds.value = allRows.value.map((row) => row.id);
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
            if (options.autoRefresh.value) refresh();
            else endHold();
        }, ms);
    }

    const allRows = computed<LobbyListRow[]>(() => {
        const matching = matchingIds.value;
        const held = heldIds.value;
        const dropInvalid = options.autoRefresh.value && !held;
        const rows: LobbyListRow[] = [];
        for (const id of held ?? [...orderedIds.value, ...appendedIds.value]) {
            const lobby = lobbyStore.lobbies[id] as LobbyListEntry | undefined;
            if (!lobby) {
                if (!dropInvalid) rows.push({ id, state: "removed" });
            } else if (matching.has(id)) {
                rows.push({ id, state: "live", lobby });
            } else if (!dropInvalid) {
                rows.push({ id, state: "stale", lobby });
            }
        }
        return rows;
    });

    refresh();

    return {
        rows: computed(() => allRows.value.slice(first.value, first.value + pageSize.value)),
        totalRecords: computed(() => allRows.value.length),
        first,
        pageSize: readonly(pageSize),
        pendingCount: computed(() => (options.autoRefresh.value ? 0 : appendedIds.value.filter((id) => matchingIds.value.has(id)).length)),
        availableTags: computed(() => sortedUnion(lobbies().flatMap((lobby) => lobby.tags ?? []))),
        availableEngineVersions: computed(() => sortedUnion(lobbies().map((lobby) => lobby.engineVersion))),
        availableGameVersions: computed(() => sortedUnion(lobbies().map((lobby) => lobby.gameVersion))),
        setQuery(next) {
            query.value = cloneLobbyListQuery(next);
            first.value = 0;
            refresh();
        },
        setPage(next) {
            first.value = next;
        },
        setPageSize(size) {
            size = Math.max(1, Math.floor(size));
            if (size === pageSize.value) return;
            first.value = Math.floor(first.value / size) * size;
            pageSize.value = size;
        },
        refresh,
        holdOrder,
    };
}

export function lobbyMatchContext(): LobbyMatchContext {
    const party = partyStore.activeParty ? partyStore.parties.get(partyStore.activeParty) : undefined;
    const partyMemberIds = new Set<UserId>(party?.members.map((member) => member.userId) ?? []);
    partyMemberIds.delete(me.userId);
    return {
        friendIds: me.friendUserIds,
        partyMemberIds,
        partySize: Math.max(1, party?.members.length ?? 0),
        devMode: settingsStore.devMode,
    };
}
