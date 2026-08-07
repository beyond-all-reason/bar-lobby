// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Lint rules that exist because of how the content layer is put together, rather than for style. Each one
// stands in for a boundary the language cannot express, so the reason it exists lives next to it.

// TypeScript cannot scope an export to a directory, so the content providers stay exported for
// content-api.ts to import and this is what keeps anything else from reaching them.
const noContentProviderImports = [
    "error",
    {
        patterns: [
            {
                group: ["**/content/engine/engine-provider", "**/content/game/game-provider", "**/content/maps/map-provider"],
                message: "Import contentAPI from @main/content/content-api instead of reaching a content provider directly.",
            },
        ],
    },
];

// The predicates in content-state.ts answer different questions about a content status, and consumers
// reading the status themselves is how they ended up disagreeing about what counts as active.
// "failed" is left out of the pattern because tachyon responses and setup stages use that word too.
const noContentStatusComparisons = [
    "error",
    {
        selector: "BinaryExpression[operator=/^[!=]==$/] > Literal[value=/^(queued|acquiring|removing)$/]",
        message: "Use isUnsettled or isInProgress from @main/content/content-state rather than comparing status.",
    },
];

export const contentLayerRules = [
    {
        files: ["src/**/*.{ts,vue}"],
        ignores: ["src/main/content/**"],
        rules: {
            "no-restricted-imports": noContentProviderImports,
        },
    },
    {
        files: ["src/**/*.{ts,vue}"],
        // content-state.ts is where the predicates are written, and content-api.ts is what assigns a
        // status in the first place.
        ignores: ["src/main/content/content-state.ts", "src/main/content/content-api.ts"],
        rules: {
            "no-restricted-syntax": noContentStatusComparisons,
        },
    },
];
