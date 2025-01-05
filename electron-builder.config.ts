import { Configuration } from "electron-builder";

/**
 * @see https://www.electron.build/configuration
 */
const config: Configuration = {
    appId: "BeyondAllReason",
    productName: "Beyond All Reason",

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
        uninstallDisplayName: "${productName}",
        oneClick: true,
        perMachine: true,
        allowToChangeInstallationDirectory: false,
    },

    // Linux
    linux: {
        target: ["AppImage"],
        category: "Game",
    },
    appImage: {},
};

export default config;
