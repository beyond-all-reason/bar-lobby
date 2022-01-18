import "@/assets/styles/styles.scss";
import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";
import { createApp, reactive, ToRefs, toRefs } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import VueNextSelect from "vue-next-select";
import VueSlider from "vue-slider-component";
import Markdown from "vue3-markdown-it";
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
import { AudioAPI } from "@/api/audio";
import { GameAPI } from "@/api/game";
import { ModalsAPI } from "@/api/modals";
import * as fs from "fs";
import { GitDownloaderAPI } from "@/api/git-downloader";
import { PRDownloaderAPI } from "@/api/pr-downloader";
import { HTTPDownloaderAPI } from "@/api/http-downloader";

declare global {
    interface Window {
        info: Info;
        api: {
            session: ToRefs<SessionType>;
            settings: StoreAPI<SettingsType>;
            client: TachyonClient;
            audio: AudioAPI;
            /** @deprecated - replace with modals */
            alerts: AlertsAPI;
            modals: ModalsAPI;
            accounts: StoreAPI<AccountType>;
            game: GameAPI;
            gitDownloader: GitDownloaderAPI;
            prDownloader: PRDownloaderAPI;
            httpDownloader: HTTPDownloaderAPI;
        }
    }
}

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        transition?: string;
        offline?: boolean;
    }
}

declare module "@vue/runtime-core" {
    export interface GlobalComponents {
        RouterLink: typeof import("vue-router")["RouterLink"];
        RouterView: typeof import("vue-router")["RouterView"];
        Range: typeof import("@/components/inputs/range.vue")["default"];
    }
}


(async () => {
    window.info = await ipcRenderer.invoke("getInfo");

    await fs.promises.mkdir(window.info.contentPath, { recursive: true });

    // TODO: API this
    const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
    const sessionValidator = ajv.compile(sessionSchema);
    const session = reactive({}) as SessionType;
    sessionValidator(session);

    window.api = {
        session: toRefs(session),
        settings: await new StoreAPI<SettingsType>("settings", settingsSchema, true).init(),
        client: new TachyonClient({
            //host: "localhost",
            host: "server2.beyondallreason.info",
            port: 8202,
            verbose: process.env.NODE_ENV !== "production"
        }),
        audio: new AudioAPI(),
        alerts: new AlertsAPI(),
        modals: new ModalsAPI(),
        accounts: await new StoreAPI<AccountType>("accounts", accountSchema).init(),
        game: new GameAPI(),
        gitDownloader: new GitDownloaderAPI(window.info.contentPath),
        prDownloader: new PRDownloaderAPI(window.info.contentPath),
        httpDownloader: new HTTPDownloaderAPI(window.info.contentPath)
    };

    document.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
        }
    });

    window.api.audio.init();

    (window as any).test = () => {
        ipcRenderer.invoke("test");
    };

    await setupVue();
})();

async function setupVue() {
    const RouterLayout = createRouterLayout(layout => {
        return import("@/layouts/" + layout + ".vue");
    });

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
    app.config.globalProperties.window = window;
    if (process.env.NODE_ENV !== "production") {
        (window as any).router = router;
    }
    app.use(router);
    app.component("vue-select", VueNextSelect);
    app.component("vue-slider", VueSlider);
    app.component("markdown", Markdown);
    app.mount("#app");
}