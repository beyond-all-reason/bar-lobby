// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { GameVersion } from "@main/content/game/game-version";

function getRapidTestNumber(version: GameVersion): number {
    const match = version.gameVersion.match(/\btest-(\d+)-/);
    return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
}

export function compareGameVersionsByVersionDesc(a: GameVersion, b: GameVersion): number {
    const testNumberDelta = getRapidTestNumber(b) - getRapidTestNumber(a);
    if (testNumberDelta !== 0) return testNumberDelta;

    return b.gameVersion.localeCompare(a.gameVersion, undefined, { numeric: true, sensitivity: "base" });
}

export function sortGameVersionsByVersionDesc(versions: GameVersion[]): GameVersion[] {
    return versions.toSorted(compareGameVersionsByVersionDesc);
}
