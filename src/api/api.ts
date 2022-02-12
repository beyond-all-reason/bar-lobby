import * as path from "path";
import * as fs from "fs";
import { TachyonClient } from "tachyon-client";
import { AlertsAPI } from "@/api/alerts";
import { AudioAPI } from "@/api/audio";
import { BattleAPI } from "@/api/battle";
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

export class API {
    public info!: Info;
    public session!: SessionAPI;
    public settings!: StoreAPI<SettingsType>;
    public client!: TachyonClient;
    public audio!: AudioAPI;
    public alerts!: AlertsAPI;
    public modals!: ModalsAPI;
    public accounts!: StoreAPI<Account>;
    public content!: ContentAPI;
    public game!: GameAPI;
    public battle!: BattleAPI;
    public workers!: WorkersAPI;

    public async init() {
        this.info = await ipcRenderer.invoke("getInfo");

        this.settings = await new StoreAPI<SettingsType>("settings", settingsSchema, true).init();

        await fs.promises.mkdir(this.settings.model.dataDir.value, { recursive: true });

        const userDataDir = this.info.userDataPath;
        const dataDir = this.settings.model.dataDir.value;

        this.session = new SessionAPI();

        this.client = new TachyonClient({
            host: "server2.beyondallreason.info",
            port: 8202,
            verbose: process.env.NODE_ENV !== "production"
        });
        this.client.socket?.on("connect", () => {
            this.session.model.offline.value = false;
        });
        this.client.socket?.on("close", () => {
            this.session.model.offline.value = true;
        });

        //this.audio = new AudioAPI().init();

        this.alerts = new AlertsAPI();

        this.modals = new ModalsAPI();

        this.accounts = await new StoreAPI<Account>("accounts", accountSchema).init();

        this.game = new GameAPI(userDataDir, dataDir);

        this.battle = new BattleAPI();

        this.workers = new WorkersAPI({
            mapCache: new Worker(new URL("../workers/map-cache-worker.ts", import.meta.url), { type: "module" })
        });
        const cacheStoreDir = path.join(this.info.userDataPath, "store");
        const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

        this.content = await new ContentAPI(userDataDir, dataDir).init();

        await this.workers.mapCache.init([ mapCacheFile, this.settings.model.dataDir.value ]);

        return this;
    }
}

export const api = new API();