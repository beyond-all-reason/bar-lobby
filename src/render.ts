import "@/assets/styles/styles.scss";
import "vue-next-select/dist/index.css";
import { createApp, ToRefs } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";
import routes from "@/routes";
import App from "@/App.vue";
import { SettingsAPI } from "@/api/settings";
import { ipcRenderer } from "electron";
import { SettingsType } from "@/model/settings";
import { TachyonClient } from "tachyon-client";
import { Field, Form } from "vee-validate";

declare global {
    interface Window {
        settings: ToRefs<SettingsType>;
        client: TachyonClient;
    }
}

(async () => {
    const settingsPath = await ipcRenderer.invoke("getSettingsPath");
    window.settings = new SettingsAPI({ settingsPath }).settings;

    window.client = new TachyonClient({
        host: "localhost",
        port: 8201,
        verbose: process.env.NODE_ENV !== "production"
    });

    await window.client.connect();

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
    app.config.globalProperties.window = window;
    app.use(router);
    app.component("vue-select", VueNextSelect);
    app.component("Form", Form);
    app.component("Field", Field);
    app.mount("#app");
}