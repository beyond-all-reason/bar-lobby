import { Configuration } from "electron-builder";

/**
 * @see https://www.electron.build/configuration
 */
const config: Configuration = {
    appId: "BeyondAllReason",
    productName: "Beyond All Reason",
    files: [
        "!**/.vscode/*",
        "!src/*",
        "!electron.vite.config.{js,ts,mjs,cjs}",
        "!{eslint.config.mjs,.prettierignore,prettier.config.mjs,README.md}",
        "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
        "!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}",
    ],
    directories: { buildResources: "buildResources" },
    asarUnpack: ["resources/**"],

    publish: { provider: "generic", url: "https://example.com/auto-updates" },
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
        oneClick: false,
        perMachine: true,
        allowToChangeInstallationDirectory: true,
    },

    // Linux
    linux: {
        target: ["AppImage"],
        category: "Game",
    },
    appImage: {},
};

export default config;
