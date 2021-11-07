module.exports = {
    lintOnSave: process.env.NODE_ENV !== "production",
    css: {
        loaderOptions: {
            scss: {
                prependData: `
                    @import "@/assets/styles/_variables.scss";
                    @import "@/assets/styles/_mixins.scss";
                    @import "@/assets/styles/_utils.scss";
                `,
            }
        }
    },
    configureWebpack: {
        // inline required to use source maps from preload.ts imports
        devtool: process.env.NODE_ENV !== "production" ? "source-map" : false,
    },
    pluginOptions: {
        electronBuilder: {
            mainProcessFile: "src/main.ts",
            mainProcessWatch: ["src/main", "src/main-window"],
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
            importPrefix: "@/views/",
            outFile: "working-files/routes.js",
            nested: false
        }
    }
};
