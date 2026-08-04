import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

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

export default [
    { files: ["**/*.{js,mjs,cjs,ts,vue}"] },
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
    {
        files: ["src/**/*.{ts,vue}"],
        ignores: ["src/main/content/**"],
        rules: {
            "no-restricted-imports": noContentProviderImports,
        },
    },
    {
        // Replays are never acquired, only written locally by the engine or copied in by the user, so
        // nothing under here is a content provider and it gets no exemption for being in this tree.
        files: ["src/main/content/replays/**/*.ts"],
        rules: {
            "no-restricted-imports": noContentProviderImports,
        },
    },
];
