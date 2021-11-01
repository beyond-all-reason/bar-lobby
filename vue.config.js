module.exports = {
    lintOnSave: process.env.NODE_ENV !== "production",
    configureWebpack: {
        // inline required to use source maps from preload.ts imports
        devtool: process.env.NODE_ENV !== "production" ? "inline-source-map" : false
    },
    pluginOptions: {
        electronBuilder: {
            mainProcessFile: "src/main.ts",
            rendererProcessFile: "src/render.ts",
            preload: "src/preload.ts",
            builderOptions: {
                productName: "BAR Lobby",
                directories: {
                    buildResources: "build"
                }
            }
        },
        autoRouting: {
            pages: "src/views",
            chunkNamePrefix: "view-",
            importPrefix: "@/views/"
        }
    }
};
