import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

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
        // Allow the wrapper itself to call window.tachyon.requestStructured directly.
        // All other renderer code must go through tachyonRequest() from @renderer/api/tachyon.
        files: ["src/renderer/api/tachyon.ts"],
        rules: {
            "no-restricted-syntax": "off",
        },
    },
    {
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector:
                        "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.object.name='window'][callee.object.property.name='tachyon'][callee.property.name='requestStructured']",
                    message: "Do not call window.tachyon.requestStructured directly. Use tachyonRequest() from @renderer/api/tachyon instead.",
                },
            ],
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
];
