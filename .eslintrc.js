module.exports = {
    root: true,
    env: {
        node: true
    },
    globals: {
        defineProps: "readonly",
        defineEmits: "readonly",
        defineExpose: "readonly"
    },
    ignorePatterns: ["dist_electron", "node_modules", "output.js", "src/routes.ts", "working-files"],
    extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/typescript/recommended"
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    plugins: [
        "unused-imports"
    ],
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "indent": "off",
        "quotes": "off",
        "semi": "off",
        "space-before-function-paren": ["error", { "anonymous": "never", "named": "never", "asyncArrow": "always" }],
        "space-before-blocks": ["error", "always"],
        "keyword-spacing": ["error"],
        "no-trailing-spaces": "error",
        "no-multiple-empty-lines": "error",
        "padded-blocks": ["error", "never"],

        "@typescript-eslint/quotes": ["error"],
        "@typescript-eslint/semi": ["error"],
        "@typescript-eslint/indent": ["error"],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-non-null-assertion": "off",

        "vue/no-dupe-keys": "off",
        "vue/html-indent": ["error", 4],
        "vue/no-multiple-template-root": ["error"],
        "vue/no-v-model-argument": "off",
        "vue/multi-word-component-names": "off",

        "unused-imports/no-unused-imports": "error",
    }
};
