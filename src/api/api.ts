import * as path from "path";
import * as fs from "fs";
import { TachyonClient } from "tachyon-client";
import { AlertsAPI } from "@/api/alerts";
import { AudioAPI } from "@/api/audio";
import { ContentAPI } from "@/api/content";
import { GameAPI } from "@/api/game";
import { ModalsAPI } from "@/api/modals";
import { SessionAPI } from "@/api/session";
import { StoreAPI } from "@/api/store";
import { WorkersAPI } from "@/api/workers";
import { Account, accountSchema } from "@/model/account";
import { settingsSchema, SettingsType } from "@/model/settings";
import { ipcRenderer } from "electron";
import { Info } from "@/model/info";

declare global {
    interface Window {
        api: {
            info: Info;
            session: SessionAPI;
            settings: StoreAPI<SettingsType>;
            client: TachyonClient;
            audio: AudioAPI;
            alerts: AlertsAPI;
            modals: ModalsAPI;
            accounts: StoreAPI<Account>;
            content: ContentAPI;
            game: GameAPI;
            workers: WorkersAPI;
        }
    }
}

export async function apiInit() {
    window.api = {} as any;

    window.api.info = await ipcRenderer.invoke("getInfo");

    window.api.settings = await new StoreAPI<SettingsType>("settings", settingsSchema, true).init();

    await fs.promises.mkdir(window.api.settings.model.dataDir.value, { recursive: true });

    const userDataDir = window.api.info.userDataPath;
    const dataDir = window.api.settings.model.dataDir.value;

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
        mapCache: new Worker(new URL("../workers/map-cache-worker.ts", import.meta.url), { type: "module" })
    });
    const cacheStoreDir = path.join(window.api.info.userDataPath, "store");
    const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

    window.api.content = await new ContentAPI(userDataDir, dataDir).init();

    await window.api.workers.mapCache.init([ mapCacheFile, window.api.settings.model.dataDir.value ]);
}