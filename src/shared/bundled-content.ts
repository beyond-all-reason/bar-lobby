// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * The engines and games an install shipped with, named in `bundled-content.json` at the root of the assets
 * directory by whatever assembled that content. Engines by their directory name, games by their full version
 * name, never a rapid tag. The client depot is built apart from the content, so the list ships with the content
 * it describes rather than with the client.
 */
export type BundledContent = { readonly engines: readonly string[]; readonly games: readonly string[] };

export const BUNDLED_CONTENT_FILE = "bundled-content.json";

function names(value: unknown) {
    return Array.isArray(value) ? value.filter((name): name is string => typeof name === "string" && name.length > 0) : [];
}

// Absent or unreadable is the same as listing nothing: the client then goes by what is installed, as it
// did before there was a list.
export function parseBundledContent(json: string | undefined): BundledContent {
    if (json === undefined) {
        return { engines: [], games: [] };
    }

    try {
        const parsed = JSON.parse(json) as { engines?: unknown; games?: unknown } | null;

        return { engines: names(parsed?.engines), games: names(parsed?.games) };
    } catch {
        return { engines: [], games: [] };
    }
}

// With exactly one of a kind there is nothing to choose, so it is what every launch uses.
export function bundledDefault(content: BundledContent | undefined, type: "engine" | "game") {
    const listed = type === "engine" ? content?.engines : content?.games;

    return listed?.length === 1 ? listed[0] : undefined;
}
