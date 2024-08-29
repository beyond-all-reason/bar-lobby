import { ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { Router } from "vue-router/auto";
import { createRouter } from "vue-router/auto";
import { createMemoryHistory } from "vue-router/auto";
import { routes } from "vue-router/auto-routes";

import { AudioAPI } from "@/api/audio";
import { CacheDbAPI } from "@/api/cache-db";
import { CommsAPI } from "@/api/comms";
import { ContentAPI } from "@/api/content/content";
import { GameAPI } from "@/api/game";
import { NotificationsAPI } from "@/api/notifications";
import { prompt } from "@/api/prompt";
import { SessionAPI } from "@/api/session";
import { StoreAPI } from "@/api/store";
import { UtilsAPI } from "@/api/utils";
import { accountSchema } from "@/model/account";
import type { Info } from "$/model/info";
import { settingsSchema } from "$/model/settings";

interface API {
    account: StoreAPI<typeof accountSchema>;
    audio: AudioAPI;
    cacheDb: CacheDbAPI;
    comms: CommsAPI;
    content: ContentAPI;
    game: GameAPI;
    info: Info;
    notifications: NotificationsAPI;
    prompt: typeof prompt;
    router: Router;
    session: SessionAPI;
    settings: StoreAPI<typeof settingsSchema>;
    utils: UtilsAPI;
}

declare global {
    const api: API;
    interface Window {
        api: API;
    }
}

export async function apiInit() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api: API = (window.api = {} as any);

    api.utils = new UtilsAPI();

    api.info = await ipcRenderer.invoke("getInfo");

    const settingsFilePath = path.join(api.info.configPath, "settings.json");
    api.settings = await new StoreAPI(settingsFilePath, settingsSchema).init();

    await fs.promises.mkdir(api.info.contentPath, {
        recursive: true,
    });

    api.session = new SessionAPI();

    // https://github.com/posva/unplugin-vue-router/discussions/63#discussioncomment-3632637
    for (const route of routes) {
        if (route.meta?.redirect && typeof route.meta?.redirect === "string") {
            route.redirect = { path: route.meta.redirect };
        }

        if (route.children) {
            for (const childRoute of route.children) {
                if (childRoute.meta?.redirect && typeof childRoute.meta?.redirect === "string") {
                    childRoute.redirect = { path: childRoute.meta.redirect };
                }
            }
        }
    }

    api.router = createRouter({
        history: createMemoryHistory(),
        routes,
    });

    api.cacheDb = await new CacheDbAPI().init();

    api.audio = await new AudioAPI().init();

    const accountFilePath = path.join(api.info.configPath, "account.json");
    api.account = await new StoreAPI(accountFilePath, accountSchema).init();

    api.game = new GameAPI();

    api.comms = new CommsAPI();

    api.content = await new ContentAPI().init();

    api.notifications = new NotificationsAPI();

    api.prompt = prompt;
}
