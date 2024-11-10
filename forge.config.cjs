const { MakerDeb } = require("@electron-forge/maker-deb");
const { MakerRpm } = require("@electron-forge/maker-rpm");
const { MakerFlatpak } = require("@electron-forge/maker-flatpak");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { VitePlugin } = require("@electron-forge/plugin-vite");

const config = {
    packagerConfig: {
        asar: false, // Cannot enable asar, it breaks map parsing
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({
            authors: "BAR Team",
            description: "Beyond All Reason Lobby",
        }),
        new MakerRpm({
            options: {
                mimeType: ["application/sdfz"],
                categories: ["Game"],
                icon: "src/renderer/assets/images/icon.png",
                homepage: "https://www.beyondallreason.info/",
                license: "MIT",
                name: "bar-lobby",
                productName: "BAR Lobby",
            },
        }),
        new MakerDeb({}),
        new MakerFlatpak({}),
    ],
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
        // {
        //     name: "@electron-forge/plugin-auto-unpack-natives",
        //     config: {},
        // },
        // Uncomment and configure fuses if needed:
        // new FusesPlugin({
        //     version: FuseVersion.V1,
        //     [FuseV1Options.RunAsNode]: false,
        //     [FuseV1Options.EnableCookieEncryption]: true,
        //     [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        //     [FuseV1Options.EnableNodeCliInspectArguments]: false,
        //     [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        //     [FuseV1Options.OnlyLoadAppFromAsar]: true,
        // }),
    ],
};

module.exports = config;
