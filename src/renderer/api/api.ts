import { ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { Router } from "vue-router/auto";
import { createRouter } from "vue-router/auto";
import { createMemoryHistory } from "vue-router/auto";

import { AudioAPI } from "@/api/audio";
import { CacheDbAPI } from "@/api/cache-db";
import { CommsAPI } from "@/api/comms";
import { ContentAPI } from "@/api/content/content";
import { GameAPI } from "@/api/game";
import { NotificationsAPI } from "@/api/notifications";
import { SessionAPI } from "@/api/session";
import { StoreAPI } from "@/api/store";
import { UtilsAPI } from "@/api/utils";
import { serverConfig } from "@/config/server";
import { accountSchema } from "@/model/account";
import type { Info } from "$/model/info";
import { settingsSchema } from "$/model/settings";

interface API {
    account: StoreAPI<typeof accountSchema>;
    notifications: NotificationsAPI;
    audio: AudioAPI;
    cacheDb: CacheDbAPI;
    comms: CommsAPI;
    content: ContentAPI;
    game: GameAPI;
    info: Info;
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

    api.router = createRouter({
        // https://github.com/posva/unplugin-vue-router/discussions/63#discussioncomment-3632637
        extendRoutes: (routes) => {
            for (const route of routes) {
                if (route.children) {
                    for (const childRoute of route.children) {
                        if (childRoute.meta?.redirect && typeof childRoute.meta?.redirect === "string") {
                            childRoute.redirect = { path: childRoute.meta.redirect };
                        }
                    }
                }
            }
            return routes;
        },
        history: createMemoryHistory(),
    });

    api.cacheDb = await new CacheDbAPI().init();

    api.audio = await new AudioAPI().init();

    const accountFilePath = path.join(api.info.configPath, "account.json");
    api.account = await new StoreAPI(accountFilePath, accountSchema).init();

    api.game = new GameAPI();

    api.comms = new CommsAPI(serverConfig);

    api.content = await new ContentAPI().init();

    api.notifications = new NotificationsAPI();
}
