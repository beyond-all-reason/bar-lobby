import { Configuration } from "electron-builder";

/**
 * @see https://www.electron.build/configuration
 */
const config: Configuration = {
    appId: "info.beyondallreason.lobby",
    // Should be the same as APP_NAME in src/main/config/app.ts and in
    // workaround in installer.nsh.
    productName: "BeyondAllReason",

    asar: true,
    disableDefaultIgnoredFiles: true,
    files: ["./.vite/**", "!node_modules", "./node_modules/7zip-bin/**"],
    directories: { buildResources: "buildResources" },
    asarUnpack: ["resources/**"],

    publish: { provider: "github" },
    fileAssociations: [
        {
            ext: "sdfz",
            description: "BAR Replay File",
            role: "Viewer",
            icon: "icon.ico",
            name: "SDFZ NAME HERE",
        },
    ],

    // Windows
    win: {
        target: ["nsis"],
    },
    nsis: {
        artifactName: "${productName}-${version}-setup.${ext}",
        uninstallDisplayName: "Beyond All Reason",
        shortcutName: "Beyond All Reason",
        oneClick: true,
        perMachine: false,
        allowToChangeInstallationDirectory: false,
        include: "build/installer.nsh",
    },

    // Linux
    linux: {
        target: ["AppImage"],
        category: "Game",
    },
    appImage: {},
};

export default config;
