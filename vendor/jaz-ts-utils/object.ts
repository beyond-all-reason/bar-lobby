// SPDX-FileCopyrightText: 2024 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT AND Unlicense
// SPDX-FileAttributionText: Original code from https://github.com/Jazcash/jaz-ts-utils

export function randomFromArray<T>(arr: T[]): T | undefined {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function removeFromArray<T>(target: T[], item: T): T[] {
    const index = target.indexOf(item);
    if (index > -1) {
        target.splice(index, 1);
    }
    return target;
}
