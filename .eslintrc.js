module.exports = {
    extends: ["./node_modules/jaz-ts-utils/.eslintrc"],
    env: {
        node: true,
        browser: true,
    },
    globals: {
        NodeJS: true,
    },
    ignorePatterns: ["dist", "build", "node_modules", "working-files", "**/*.js", "typed-router.d.ts"],
    rules: {
        // Rules should only be added here for testing temporarily and should eventually be moved into jaz-ts-utils to ensure consistency across projects
        "func-style": ["error", "declaration"],
        "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
    },
};
