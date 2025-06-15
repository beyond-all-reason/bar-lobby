// SPDX-FileCopyrightText: 2024 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT AND Unlicense
// SPDX-FileAttributionText: Original code from https://github.com/Jazcash/jaz-ts-utils

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            resolve();
        }, ms);
        if (signal) {
            signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Delay aborted"));
            });
        }
    });
}
