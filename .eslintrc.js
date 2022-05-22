module.exports = {
    plugins: ["prettier"],
    extends: ["./node_modules/jaz-ts-utils/.eslintrc", "plugin:prettier/recommended"],
    rules: {
        // Rules should only be added here for testing temporarily and should eventually be moved into jaz-ts-utils to ensure consistency across projects
        "prettier/prettier": [
            "error",
            {
                useTabs: false,
                trailingComma: "es5",
                tabWidth: 4,
                semi: true,
                singleQuote: false,
                endOfLine: "auto",
                printWidth: 200,
            },
        ],
    },
};
