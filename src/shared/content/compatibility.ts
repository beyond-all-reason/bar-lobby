// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Compatibility as read, so read-only content can be checked too.
type AnyCompatibility = readonly { readonly engineVersion: string; readonly gameVersions: readonly string[] }[];

export type EngineGamePair = { engineVersion: string; gameVersion: string };

/**
 * The engine and game pairs content accepts that are also on offer, in the content's order. An engine and
 * a game that are each accepted, but never in the same entry, are not a pair.
 *
 * `available` takes the same shape as `compatibility`, so a build can declare what it bundles as it is.
 */
export function matchingPairs(accepted: AnyCompatibility, available: AnyCompatibility): EngineGamePair[] {
    const availableGames = new Map<string, Set<string>>();
    for (const { engineVersion, gameVersions } of available) {
        const games = availableGames.get(engineVersion) ?? new Set<string>();
        gameVersions.forEach((game) => games.add(game));
        availableGames.set(engineVersion, games);
    }

    return accepted.flatMap(({ engineVersion, gameVersions }) => {
        const games = availableGames.get(engineVersion);

        return games ? gameVersions.filter((game) => games.has(game)).map((gameVersion) => ({ engineVersion, gameVersion })) : [];
    });
}

export function isCompatible(accepted: AnyCompatibility, available: AnyCompatibility): boolean {
    return matchingPairs(accepted, available).length > 0;
}

export function describeCompatibility(compatibility: AnyCompatibility): string {
    return compatibility.map(({ engineVersion, gameVersions }) => `engine ${engineVersion} with game${gameVersions.length > 1 ? "s" : ""} ${gameVersions.join(", ")}`).join("; ");
}
