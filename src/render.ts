import { createApp, ToRefs } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";

import "@/assets/styles/styles.scss";
import routes from "@/routes";
import App from "@/App.vue";
import { SettingsAPI } from "@/store/settings";
import { ipcRenderer } from "electron";
import { SettingsType } from "@/model/settings";

(async () => {
    const settingsPath = await ipcRenderer.invoke("getSettingsPath");
    const settingsAPI = new SettingsAPI({ settingsPath });
    window.settings = settingsAPI.settings;

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

    app.config.globalProperties.window = window;

    app.mount("#app");
}

declare global {
    interface Window {
        settings: ToRefs<SettingsType>;
    }
}