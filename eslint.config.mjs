import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

export default [
    { files: ["**/*.{js,mjs,cjs,ts,vue}"] },
    {
        ignores: ["**/.vite", "**/dist", "**/build", "**/out", "**/dist_electron", "**/node_modules", "**/working-files", "**/typed-router.d.ts", "**/vendor", "forge.config.cjs"],
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
];
