import "@/assets/styles/styles.scss";
import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";
import { createApp, reactive, ToRefs, toRefs } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";
import VueSlider from "vue-slider-component";
import routes from "@/routes";
import App from "@/App.vue";
import { StoreAPI } from "@/api/store";
import { ipcRenderer } from "electron";
import { TachyonClient } from "tachyon-client";
import { AlertsAPI } from "@/api/alerts";
import { Info } from "@/model/info";
import { settingsSchema, SettingsType } from "@/model/settings";
import { accountSchema, AccountType } from "@/model/account";
import { sessionSchema, SessionType } from "@/model/session";
import Ajv from "ajv";

declare global {
    interface Window {
        info: Info;
        api: {
            session: ToRefs<SessionType>;
            settings: StoreAPI<SettingsType>;
            client: TachyonClient;
            alerts: AlertsAPI;
            accounts: StoreAPI<AccountType>;
        }
    }
}

(async () => {
    window.info = await ipcRenderer.invoke("getInfo");

    const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
    const sessionValidator = ajv.compile(sessionSchema);
    const session = reactive({}) as SessionType;
    sessionValidator(session);

    window.api = {
        session: toRefs(session),
        settings: await new StoreAPI<SettingsType>("settings.json", settingsSchema).init(),
        client: new TachyonClient({
            //host: "localhost",
            host: "server2.beyondallreason.info",
            port: 8201,
            verbose: process.env.NODE_ENV !== "production"
        }),
        alerts: new AlertsAPI(),
        accounts: await new StoreAPI<AccountType>("accounts.json", accountSchema).init()
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
    app.component("vue-slider", VueSlider);
    app.mount("#app");
}