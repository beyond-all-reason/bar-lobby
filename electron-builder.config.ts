import { Configuration } from "electron-builder";

/**
 * @see https://www.electron.build/configuration
 */
const config: Configuration = {
    appId: "BeyondAllReason",
    productName: "Beyond All Reason",
    files: [
        "!**/.vscode/*",
        "!{docs,src,out,tests,vendor}/*",
        "!vite.*.config.{js,ts,mjs,cjs,mts}",
        "!{eslint.config.mjs,.prettierignore,prettier.config.mjs,README.md}",
        "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
        "!{tsconfig.json,tsconfig.*.json}",
        "!{electron-builder.config.ts,forge.config.cjs}",
    ],
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
