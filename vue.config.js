module.exports = {
    lintOnSave: process.env.NODE_ENV !== "production",
    configureWebpack: {
        devtool: process.env.NODE_ENV !== "production" ? "source-map" : false
    },
    pluginOptions: {
        electronBuilder: {
            builderOptions: {
            }
        },
        autoRouting: {
            chunkNamePrefix: "page-"
        }
    }
};
