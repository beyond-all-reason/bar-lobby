const WorkerPlugin = require("worker-plugin");
const { IgnorePlugin } = require("webpack");

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
        },
        plugins: [
            new WorkerPlugin(),
            new IgnorePlugin(/build\/Debug\/nodegit.node$/i)
        ],
        externals: {
            nodegit: "commonjs nodegit"
        }
    },
    pluginOptions: {
        electronBuilder: {
            mainProcessFile: "src/main.ts",
            mainProcessWatch: ["src/main.ts", "src/main-window.ts", "src/api/**/*"],
            rendererProcessFile: "src/render.ts",
            customFileProtocol: "bar://./",
            builderOptions: {
                productName: "BAR Lobby",
                directories: {
                    buildResources: "build"
                },
                publish: ["github"],
                extraResources: [
                    {
                        "from": "extra_resources",
                        "to": ".",
                        "filter": "**/*"
                    }
                ]
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
