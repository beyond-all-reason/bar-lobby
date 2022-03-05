import * as fs from "fs";
import { TachyonClient } from "tachyon-client";
import { AudioAPI } from "@/api/audio";
import { ContentAPI } from "@/api/content/content";
import { GameAPI } from "@/api/game";
import { ModalsAPI } from "@/api/modals";
import { SessionAPI } from "@/api/session";
import { StoreAPI } from "@/api/store";
import type { Account} from "@/model/account";
import { accountSchema } from "@/model/account";
import type { SettingsType } from "@/model/settings";
import { settingsSchema } from "@/model/settings";
import { ipcRenderer } from "electron";
import type { Info } from "@/model/info";

declare global {
    interface Window {
        api: {
            info: Info;
            session: SessionAPI;
            settings: StoreAPI<SettingsType>;
            client: TachyonClient;
            audio: AudioAPI;
            modals: ModalsAPI;
            account: StoreAPI<Account>;
            content: ContentAPI;
            game: GameAPI;
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
    window.api.client.socket?.on("connect", () => window.api.session.model.offline = false);
    window.api.client.socket?.on("close", () => window.api.session.model.offline = true);

    window.api.audio = new AudioAPI().init();

    window.api.modals = new ModalsAPI();

    window.api.account = await new StoreAPI<Account>("account", accountSchema).init();

    window.api.game = new GameAPI(userDataDir, dataDir);

    window.api.content = await new ContentAPI(userDataDir, dataDir).init();
}