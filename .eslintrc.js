module.exports = {
    root: true,
    env: {
        node: true
    },
    "extends": [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/typescript/recommended"
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "indent": ["error", 4],
        "quotes": ["error", "double"],
        "semi": ["error", "always"],

        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",

        "vue/no-dupe-keys": "off",
        "vue/html-indent": ["error", 4],
    }
};
