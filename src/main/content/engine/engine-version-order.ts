// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Matches new engine version tags (e.g. "2025.01.3", "2025.01.3-rc1")
const versionPattern = /^(\d{4})\.(\d{2})\.(\d{1,2})(?:-rc(\d+))?$/;
// Matches old engine version tags (e.g. "105.1.1-2590-gb9462a0"): major.minor.patch-commitsSinceTag-gHash
const oldVersionPattern = /^(\d{1,3})\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/;

export function isCompatibleEngineVersion(id: string) {
    return versionPattern.test(id) || oldVersionPattern.test(id) || id.includes("local");
}

function parseVersion(id: string) {
    const match = versionPattern.exec(id) ?? oldVersionPattern.exec(id);
    if (!match) {
        return undefined;
    }

    const [, first, second, third, last] = match;

    return [Number(first), Number(second), Number(third), last === undefined ? Infinity : Number(last)];
}

// Ascending. Components are not zero padded and a release candidate precedes its release,
// so neither survives a string comparison.
export function compareEngineVersions(a: string, b: string) {
    const left = parseVersion(a);
    const right = parseVersion(b);

    if (!left || !right) {
        return (left ? 1 : 0) - (right ? 1 : 0);
    }

    for (let i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) {
            return left[i] - right[i];
        }
    }

    return 0;
}
