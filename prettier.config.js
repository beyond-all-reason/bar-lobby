module.exports = {
    ...require("./node_modules/jaz-ts-utils/prettier.config"),
    overrides: [
        {
            "files": "src/**/*.vue",
            "options": {
                "printWidth": 140
            }
        }
    ]
};
