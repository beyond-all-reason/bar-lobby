if (process.env.VITE_APP_VERSION === undefined) {
    const now = new Date();
    process.env.VITE_APP_VERSION = `${now.getUTCFullYear() - 2000}.${now.getUTCMonth() + 1}.${now.getUTCDate()}-${now.getUTCHours() * 60 + now.getUTCMinutes()}`;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
    files: ["out/main", "out/renderer", "node_modules/better-sqlite3"],
    asarUnpack: ["**/*.{node,dll}"],
    directories: {
        buildResources: "buildResources",
    },
    appId: "beyond-all-reason",
    productName: "Beyond All Reason",
    extraResources: [
        {
            from: "resources",
            to: ".",
            filter: "**/*",
        },
    ],
    win: {
        target: ["nsis"],
    },
    nsis: {
        oneClick: false,
        perMachine: true,
        allowToChangeInstallationDirectory: true,
    },
    linux: {
        target: ["AppImage"],
        category: "Game",
    },
    publish: ["github"],
    extraMetadata: {
        version: process.env.VITE_APP_VERSION,
    },
};

module.exports = config;
