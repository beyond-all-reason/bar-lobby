module.exports = {
    lintOnSave: true,
    css: {
        loaderOptions: {
            scss: {
                prependData: `
                    @use "@/assets/styles/_mixins.scss";
                    @use "@/assets/styles/_utils.scss";
                `,
            }
        }
    },
    configureWebpack: {
        devtool: process.env.NODE_ENV !== "production" ? "eval-source-map" : false,
        module: {
            rules: [
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: "javascript/auto"
                }
            ]
        }
    },
    pluginOptions: {
        electronBuilder: {
            mainProcessFile: "src/main.ts",
            mainProcessWatch: ["src/main.ts", "src/main-window.ts", "src/api/**/*"],
            rendererProcessFile: "src/render.ts",
            customFileProtocol: "bar://./",
            nodeIntegration: true,
            builderOptions: {
                productName: "BAR Lobby",
                directories: {
                    buildResources: "build"
                },
                extraResources: [
                    {
                        "from": "resources",
                        "to": ".",
                        "filter": "**/*"
                    }
                ],
                win: {
                    target: ["nsis", "portable"]
                },
                linux: {
                    target: ["deb", "tar.gz"]
                },
                publish: ["github"],
            },
            chainWebpackRendererProcess: config => {
                config.target("electron-renderer");
            }
        },
        autoRouting: {
            pages: "src/views",
            chunkNamePrefix: "view-",
            importPrefix: "@/views/",
            nested: false,
            dynamicImport: false,
            outFile: "src/routes.ts",
        }
    }
};
