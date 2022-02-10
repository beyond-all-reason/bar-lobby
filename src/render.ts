import * as fs from "fs";
import * as path from "path";
import { ipcRenderer } from "electron";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";
import VueSlider from "vue-slider-component";
import { TachyonClient } from "tachyon-client";
import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";

import App from "@/App.vue";
import "@/assets/styles/styles.scss";
import routes from "@/routes";
import { StoreAPI } from "@/api/store";
import { AlertsAPI } from "@/api/alerts";
import { settingsSchema, SettingsType } from "@/model/settings";
import { accountSchema, Account } from "@/model/account";
import { AudioAPI } from "@/api/audio";
import { GameAPI } from "@/api/game";
import { ModalsAPI } from "@/api/modals";
import { ContentAPI } from "@/api/content";
import DefaultLayout from "@/layouts/default.vue";
import { WorkersAPI } from "@/api/workers";
import { SessionAPI } from "@/api/session";

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        transition?: string;
        offline?: boolean;
    }
}

(async () => {
    window.info = await ipcRenderer.invoke("getInfo");

    await setupAPIs();

    await setupVue();

    document.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
        }
    });
})();

async function setupVue() {
    const RouterLayout = createRouterLayout(async () => DefaultLayout);

    const router = createRouter({
        history: createWebHashHistory(),
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
    app.component("vue-slider", VueSlider);
    app.mount("#app");

    app.config.globalProperties.window = window;
    if (process.env.NODE_ENV !== "production") {
        (window as any).router = router;
    }
}

async function setupAPIs() {
    window.api = {} as API;

    window.api.settings = await new StoreAPI<SettingsType>("settings", settingsSchema, true).init();

    await fs.promises.mkdir(window.api.settings.model.dataDir.value, { recursive: true });

    const userDataDir = window.info.userDataPath;
    const dataDir = window.api.settings.model.dataDir;

    window.api.session = new SessionAPI();

    window.api.client = new TachyonClient({
        host: "server2.beyondallreason.info",
        port: 8202,
        verbose: process.env.NODE_ENV !== "production"
    });
    window.api.client.socket?.on("connect", () => {
        window.api.session.model.offline.value = false;
    });
    window.api.client.socket?.on("close", () => {
        window.api.session.model.offline.value = true;
    });

    window.api.audio = new AudioAPI().init();

    window.api.alerts = new AlertsAPI();

    window.api.modals = new ModalsAPI();

    window.api.accounts = await new StoreAPI<Account>("accounts", accountSchema).init();

    window.api.game = new GameAPI(userDataDir, dataDir);

    window.api.workers = new WorkersAPI({
        mapCache: new Worker(new URL("./workers/map-cache-worker.ts", import.meta.url), { type: "module" })
    });
    const cacheStoreDir = path.join(window.info.userDataPath, "store");
    const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

    window.api.content = await new ContentAPI(userDataDir, dataDir).init();

    await window.api.workers.mapCache.init([ mapCacheFile, window.api.settings.model.dataDir.value ]);
}