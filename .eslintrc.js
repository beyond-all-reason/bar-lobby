module.exports = {
    extends: "./node_modules/jaz-ts-utils/.eslintrc",
    rules: {
        // Rules should only be added here for testing temporarily and should eventually be moved into jaz-ts-utils to ensure consistency across projects

        "vue/max-attributes-per-line": ["error", {
            "singleline": {
                "max": 6
            },
            "multiline": {
                "max": 1
            }
        }],
        "vue/first-attribute-linebreak": "error",
        "vue/attribute-hyphenation": ["error", "never"],
    }
};
