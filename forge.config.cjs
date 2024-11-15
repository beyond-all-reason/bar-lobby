// const { MakerDeb } = require("@electron-forge/maker-deb");
// const { MakerRpm } = require("@electron-forge/maker-rpm");
// const { MakerFlatpak } = require("@electron-forge/maker-flatpak");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { VitePlugin } = require("@electron-forge/plugin-vite");

const config = {
    // packagerConfig: {
    //     asar: false, // Cannot enable asar, it breaks map parsing
    //     icon: "src/renderer/assets/images/icon",
    // },
    // rebuildConfig: {},
    // makers: [
    //     new MakerSquirrel({
    //         authors: "BAR Team",
    //         description: "Beyond All Reason Lobby",
    //         setupIcon: "src/renderer/assets/images/icon.ico",
    //         loadingGif: "src/renderer/assets/images/BAR_installer.png",
    //     }),
    // ],
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
