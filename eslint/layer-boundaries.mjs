// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// The renderer layer boundaries from #727, as warnings until the renderer has moved over.

// The namespaces preload.ts exposes through contextBridge.exposeInMainWorld.
const preloadNamespaces = [
    "auth",
    "autoUpdater",
    "barNavigation",
    "config",
    "content",
    "engine",
    "game",
    "info",
    "log",
    "mainWindow",
    "maps",
    "misc",
    "notifications",
    "paths",
    "replays",
    "settings",
    "shell",
    "tachyon",
];

const storeUpdateImports = {
    group: ["@renderer/store/*"],
    importNamePattern: "Updates$",
    message: "Only logic changes a store. Call the matching action in @renderer/logic instead.",
};

export const layerBoundaryRules = [
    {
        files: ["src/renderer/**/*.{ts,vue}"],
        ignores: ["src/renderer/api/**"],
        rules: {
            "no-restricted-properties": ["warn", ...preloadNamespaces.map((property) => ({ object: "window", property, message: "Go through @renderer/api rather than window." }))],
        },
    },
    {
        files: ["src/renderer/logic/**/*.ts"],
        rules: {
            "@typescript-eslint/no-restricted-imports": [
                "warn",
                {
                    paths: [
                        { name: "@renderer/router", message: "Logic doesn't navigate. Views do after their own clicks." },
                        { name: "vue-router", message: "Logic doesn't navigate. Views do after their own clicks." },
                        { name: "@renderer/api/notifications", message: "Logic doesn't show alerts. Views do after their own clicks." },
                        { name: "@renderer/audio/audio", message: "Logic doesn't play sounds. Views do after their own clicks." },
                        { name: "@renderer/utils/alert-request-failure", message: "Only views show alerts, after their own clicks." },
                    ],
                    patterns: [{ group: ["@renderer/components/*", "@renderer/views/*", "*.vue"], message: "Logic doesn't import components or views." }],
                },
            ],
        },
    },
    {
        files: ["src/renderer/store/**/*.ts"],
        // stores.ts starts the stores and logic up rather than holding state itself.
        ignores: ["src/renderer/store/stores.ts"],
        rules: {
            "@typescript-eslint/no-restricted-imports": [
                "warn",
                {
                    paths: [
                        { name: "@renderer/router", message: "Stores hold state. Navigation belongs in views." },
                        { name: "@renderer/utils/alert-request-failure", message: "Only views show alerts, after their own clicks." },
                    ],
                    patterns: [
                        { group: ["@renderer/api/*"], message: "Stores hold state. Calls to main belong in @renderer/logic." },
                        { group: ["@renderer/logic/*"], message: "Stores hold state. Logic calls stores, not the other way round." },
                        { ...storeUpdateImports, message: "A store only changes its own state." },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/renderer/{components,views,composables}/**/*.{ts,vue}", "src/renderer/App.vue"],
        rules: {
            "@typescript-eslint/no-restricted-imports": ["warn", { patterns: [storeUpdateImports] }],
        },
    },
];
