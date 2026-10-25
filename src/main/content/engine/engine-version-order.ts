// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// TODO: add support for old engine version tag naming scheme, careful it is not string sortable (!)
// Matches new engine version tags (e.g. "2025.01.3", "2025.01.3-rc1")
const versionPattern = /^(\d{4})\.(\d{2})\.(\d{1,2})(?:-rc(\d+))?$/;

export function isCompatibleEngineVersion(id: string) {
    return versionPattern.test(id) || id.includes("local");
}

function parseVersion(id: string) {
    const match = versionPattern.exec(id);
    if (!match) {
        return undefined;
    }

    const [, year, month, patch, releaseCandidate] = match;

    return [Number(year), Number(month), Number(patch), releaseCandidate === undefined ? Infinity : Number(releaseCandidate)];
}

// Ascending. The patch component is not zero padded and a release candidate precedes its release,
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
