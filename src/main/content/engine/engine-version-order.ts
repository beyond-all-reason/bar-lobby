// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Matches new engine version tags (e.g. "2025.01.3", "2025.01.3-rc1")
const versionPattern = /^(\d{4})\.(\d{2})\.(\d{1,2})(?:-rc(\d+))?$/;
// Matches old engine versions as the release index and replays name them, the build's branch after the tag
// (e.g. "105.1.1-2590-gb9462a0 BAR105", "105.0-430-g2727993 BAR105", "104.0.1-1978-gcd328de BAR")
const oldVersionPattern = /^(\d{2,3})\.(\d+)(?:\.(\d+))?-(\d+)-g[0-9a-f]+ [\w-]+$/;

export function isCompatibleEngineVersion(id: string) {
    return versionPattern.test(id) || oldVersionPattern.test(id) || id.includes("local");
}

function parseVersion(id: string) {
    const match = versionPattern.exec(id);
    if (match) {
        const [, year, month, patch, releaseCandidate] = match;

        return [Number(year), Number(month), Number(patch), releaseCandidate === undefined ? Infinity : Number(releaseCandidate)];
    }

    // Below every new version, whose first component is a year.
    const old = oldVersionPattern.exec(id);
    if (old) {
        const [, major, minor, patch, commits] = old;

        return [Number(major), Number(minor), Number(patch ?? 0), Number(commits)];
    }

    return undefined;
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
