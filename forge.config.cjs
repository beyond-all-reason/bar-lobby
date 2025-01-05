const { VitePlugin } = require("@electron-forge/plugin-vite");

const config = {
    plugins: [
        new VitePlugin({
            build: [
                {
                    entry: "src/main/main.ts",
                    config: "vite.main.config.mts",
                    target: "main",
                },
                {
                    entry: "src/preload/preload.ts",
                    config: "vite.preload.config.mts",
                    target: "preload",
                },
            ],
            renderer: [
                {
                    name: "main_window",
                    config: "vite.renderer.config.mts",
                },
            ],
        }),
    ],
};

module.exports = config;
