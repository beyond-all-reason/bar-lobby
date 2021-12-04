import "@/assets/styles/styles.scss";
import "vue-next-select/dist/index.css";
import { createApp } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";
import routes from "@/routes";
import App from "@/App.vue";
import { SettingsAPI } from "@/api/settings";
import { ipcRenderer } from "electron";
import { TachyonClient } from "tachyon-client";
import { Field, Form } from "vee-validate";
import { AlertsAPI } from "@/api/alerts";
import { Info } from "@/model/info";

declare global {
    interface Window {
        info: Info;
        api: {
            settings: SettingsAPI;
            client: TachyonClient;
            alerts: AlertsAPI;
        }
    }
}

(async () => {
    window.info = await ipcRenderer.invoke("getInfo");

    const settingsPath = window.info.settingsPath;

    window.api = {
        settings: new SettingsAPI({ settingsPath }),
        client: new TachyonClient({
            //host: "localhost",
            host: "server2.beyondallreason.info",
            port: 8201,
            verbose: process.env.NODE_ENV !== "production"
        }),
        alerts: new AlertsAPI()
    };

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