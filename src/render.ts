import { createApp, ToRefs } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";

import "@/assets/styles/styles.scss";
import "vue-next-select/dist/index.css";
import routes from "@/routes";
import App from "@/App.vue";
import { SettingsAPI } from "@/api/settings";
import { ipcRenderer } from "electron";
import { SettingsType } from "@/model/settings";
import { TachyonAPI } from "@/api/tachyon";

declare global {
    interface Window {
        settings: ToRefs<SettingsType>;
        client: TachyonAPI;
    }
}

(async () => {
    const settingsPath = await ipcRenderer.invoke("getSettingsPath");
    const settingsAPI = new SettingsAPI({ settingsPath });
    window.settings = settingsAPI.settings;

    const tachyonAPI = new TachyonAPI({
        host: "localhost",
        port: 8201,
    });
    window.client = tachyonAPI;

    await setupVue();
})();

async function setupVue() {
    const RouterLayout = createRouterLayout(layout => {
        return import("@/layouts/" + layout + ".vue");
    });

    const router = createRouter({
        history: process.env.IS_ELECTRON ? createWebHashHistory() : createWebHistory(process.env.BASE_URL),
        routes: [
            {
                path: "/",
                component: RouterLayout,
                children: routes
            }
        ]
    });

    const app = createApp(App);

    app.use(router);

    app.component("vue-select", VueNextSelect);

    app.config.globalProperties.window = window;

    app.mount("#app");
}