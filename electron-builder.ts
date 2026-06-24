import { Configuration } from "electron-builder";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @see https://www.electron.build/configuration
 */
const defaultBundledAssetsPath = resolve("../../artifacts/thread-03-native-engine-candidate");
const bundledAssetsPath = process.env.BAR_BUNDLED_ASSETS_PATH || (existsSync(defaultBundledAssetsPath) ? defaultBundledAssetsPath : undefined);

const bundledAssetsExtraResources: Configuration["extraResources"] = bundledAssetsPath
    ? [
          {
              from: bundledAssetsPath,
              to: "bundled-assets",
          },
      ]
    : [];

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
    extraResources: bundledAssetsExtraResources,

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
        extraResources: [
            {
                from: "buildResources/cacert.pem",
                to: "cacert.pem",
            },
        ],
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

    // macOS
    mac: {
        target: ["dir"],
        category: "public.app-category.games",
        icon: "buildResources/icon.icns",
        minimumSystemVersion: "26.5",
    },
};

export default config;
