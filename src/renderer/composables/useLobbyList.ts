// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, readonly, ref, shallowRef, watch, type ComputedRef, type Ref } from "vue";
import { watchThrottled } from "@vueuse/core";
import type { UserId } from "tachyon-protocol/types";
import { cloneLobbyListQuery, type LobbyListQuery } from "@shared/lobby-list-query";
import type { LobbyListEntry, LobbyListRow, LobbyMatchContext } from "@renderer/model/lobby-list";
import { matchesFilters } from "@renderer/components/lobbies/list/lobby-filters";
import { compareLobbies } from "@renderer/components/lobbies/list/lobby-sorts";
import { lobbyStore } from "@renderer/store/lobby.store";
import { me } from "@renderer/store/me.store";
import { partyStore } from "@renderer/store/party.store";
import { settingsStore } from "@renderer/store/settings.store";

/** How often auto-refresh may re-order the list while lobbies are changing. */
export const AUTO_REFRESH_THROTTLE_MS = 2000;

/** The page size until the page has measured how many rows fit. */
export const LOBBY_LIST_PAGE_SIZE = 16;

/**
 * What the custom lobbies page reads the list through. The local source below filters the
 * full list the server pushes to us; a server-side one would send the query and page instead
 * and fill the same refs from the response, without the page changing.
 */
export interface LobbyListSource {
    /** The rows on the current page. */
    rows: ComputedRef<LobbyListRow[]>;
    totalRecords: ComputedRef<number>;
    first: Ref<number>;
    pageSize: Readonly<Ref<number>>;
    /** Lobbies added to the bottom of the list since it was last ordered. */
    pendingCount: ComputedRef<number>;
    availableTags: ComputedRef<string[]>;
    availableEngineVersions: ComputedRef<string[]>;
    availableGameVersions: ComputedRef<string[]>;
    /** Replaces the query and re-orders from the first page. */
    setQuery(query: LobbyListQuery): void;
    setPage(first: number): void;
    /** Changes how many rows a page holds, keeping the top row of the current page in view. */
    setPageSize(size: number): void;
    /** Re-orders the list against the current query, dropping placeholders for closed lobbies. */
    refresh(): void;
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
 * Orders the list once and then holds that order while lobbies change underneath it, so rows
 * don't jump around as players come and go. Lobbies keep their live data, but a lobby that
 * stops matching stays where it was (stale), a closed one leaves a placeholder (removed), and
 * a newly matching one goes to the bottom. A refresh puts everything back in order.
 */
export function createLocalLobbyListSource(options: LocalLobbyListSourceOptions): LobbyListSource {
    const now = options.now ?? Date.now;
    const query = shallowRef<LobbyListQuery>(cloneLobbyListQuery(options.query));
    const orderedIds = shallowRef<string[]>([]);
    const appendedIds = shallowRef<string[]>([]);
    const first = ref(0);
    const pageSize = ref(LOBBY_LIST_PAGE_SIZE);

    const lobbies = () => Object.values(lobbyStore.lobbies) as LobbyListEntry[];

    const matchingIds = computed(() => {
        const ctx = options.context();
        return new Set(
            lobbies()
                .filter((lobby) => matchesFilters(lobby, query.value.filters, ctx))
                .map((lobby) => lobby.id)
        );
    });

    function refresh() {
        const ctx = options.context();
        const at = now();
        orderedIds.value = lobbies()
            .filter((lobby) => matchesFilters(lobby, query.value.filters, ctx))
            .sort((a, b) => compareLobbies(a, b, query.value.sort, at))
            .map((lobby) => lobby.id);
        appendedIds.value = [];
        first.value = Math.min(first.value, Math.max(0, Math.floor((orderedIds.value.length - 1) / pageSize.value) * pageSize.value));
    }

    // Once a lobby has been appended it keeps its place like any other row, rather than coming
    // and going as it matches and stops matching.
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

    // Anything ordered against a list that has since been replaced or cleared (a reset from the
    // server, going offline, switching servers) would all read as closed, so start over.
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
            if (options.autoRefresh.value) refresh();
        },
        { deep: true, throttle: AUTO_REFRESH_THROTTLE_MS, trailing: true }
    );

    watch(options.autoRefresh, (enabled) => {
        if (enabled) refresh();
    });

    // Auto-refresh would drop closed and no longer matching lobbies on its next pass anyway, so they
    // go straight away rather than showing as removed or stale until that pass lands.
    const allRows = computed<LobbyListRow[]>(() => {
        const matching = matchingIds.value;
        const dropInvalid = options.autoRefresh.value;
        const rows: LobbyListRow[] = [];
        for (const id of [...orderedIds.value, ...appendedIds.value]) {
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
        // Auto-refresh folds appended lobbies in on its own (after a throttle), so it shows no count
        // rather than one that flickers up until that refresh lands.
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
    };
}

/** What the filters need to know about the user, read from the stores. */
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

/**
 * Tags come from the server, so a tag chosen on one server means nothing on another. Clears the
 * persisted tags when they were chosen on a different server, and records the current one.
 */
export function reconcileTagsServer(settings: Pick<typeof settingsStore, "customLobbiesQuery" | "customLobbiesTagsServer">, server: string) {
    if (settings.customLobbiesTagsServer === server) return;
    delete settings.customLobbiesQuery.filters.tags;
    settings.customLobbiesTagsServer = server;
}
