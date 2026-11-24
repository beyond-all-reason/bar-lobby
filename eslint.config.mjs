import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import json from "@eslint/json";

import { contentLayerRules } from "./eslint/content-layer.mjs";
import { layerBoundaryRules } from "./eslint/layer-boundaries.mjs";
import { restrictedSyntaxRules } from "./eslint/restricted-syntax.mjs";

const sourceFiles = ["**/*.{js,mjs,cjs,ts,vue}"];

// A config without `files` applies to every linted file, JSON included, and the JS rules crash on
// JSON. Everything below that doesn't name its own files is kept to the source files.
const forSource = (configs) => configs.map((config) => (config.files ? config : { ...config, files: sourceFiles }));

export default [
    { files: sourceFiles },
    {
        ignores: [
            "**/.vite",
            "**/dist",
            "**/build",
            "**/out",
            "**/dist_electron",
            "**/node_modules",
            // Agent worktrees hold whole copies of this repo, which the unscoped lint would walk into.
            "**/.claude",
            "**/working-files",
            "**/typed-router.d.ts",
            "**/vendor",
            "forge.config.cjs",
            "state*/",
            "assets*/",
        ],
    },
    ...forSource([
        {
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.node,
                    defineProps: "readonly",
                    defineEmits: "readonly",
                    defineExpose: "readonly",
                    withDefaults: "readonly",
                    api: "readonly",
                },
            },
        },
        pluginJs.configs.recommended,
        ...tseslint.configs.recommended,
        ...pluginVue.configs["flat/essential"],
        { files: ["**/*.vue"], languageOptions: { parserOptions: { parser: tseslint.parser } } },
        {
            rules: {
                "vue/multi-word-component-names": "off",
                "@typescript-eslint/no-unused-vars": "warn",
                "@typescript-eslint/no-unused-expressions": [
                    "warn",
                    {
                        allowShortCircuit: true,
                        allowTernary: true,
                    },
                ],
                "@typescript-eslint/no-explicit-any": "warn",
                "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
                "@typescript-eslint/no-unsafe-function-type": "warn",
            },
        },
        ...contentLayerRules,
        ...restrictedSyntaxRules,
        ...layerBoundaryRules,
    ]),
    // JSON.parse keeps only the last of two identical keys, so a duplicated translation key silently
    // drops a string instead of failing anywhere.
    {
        files: ["**/*.json"],
        // Lockfiles key the root package as "", and bad-json is malformed on purpose for the content checks.
        ignores: ["**/package-lock.json", "tests/fixtures/content-broken/scenarios/bad-json/**"],
        plugins: { json },
        language: "json/json",
        rules: json.configs.recommended.rules,
    },
    // These are read as JSON with comments.
    { files: ["**/tsconfig*.json", ".vscode/*.json"], language: "json/jsonc" },
];
