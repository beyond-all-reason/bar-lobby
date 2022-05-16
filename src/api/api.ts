import * as fs from "fs";
import * as path from "path";
import * as os from "os";
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
import { tachyonLog } from "@/utils/tachyon-log";

interface API {
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

declare global {
    const api: API;
    interface Window {
        api: API
    }
}

export async function apiInit() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.api = {} as any;

    api.info = await ipcRenderer.invoke("getInfo");

    api.settings = await new StoreAPI<SettingsType>("settings", settingsSchema, true).init();

    if (!fs.existsSync(api.settings.model.dataDir.value)) {
        if (process.platform === "win32") {
            api.settings.model.dataDir.value = path.join(os.homedir(), "Documents", "My Games", "Beyond All Reason");
        } else if (process.platform === "linux") {
            api.settings.model.dataDir.value = path.join(os.homedir(), ".beyond-all-reason");
        }
    }

    await fs.promises.mkdir(api.settings.model.dataDir.value, { recursive: true });

    const userDataDir = api.info.userDataPath;
    const dataDir = api.settings.model.dataDir.value;

    api.session = new SessionAPI();

    api.client = new TachyonClient({
        host: "server2.beyondallreason.info",
        port: 8202,
        verbose: true,//process.env.NODE_ENV !== "production" // TODO: add toggle to debug tools
        logMethod: tachyonLog
    });
    api.client.socket?.on("connect", () => api.session.offlineMode.value = false);
    api.client.socket?.on("close", () => api.session.offlineMode.value = true);
    //api.client.onResponse("s.system.server_event").add((data) => {
    //    if (event.data === "server_restart") {
    //        api.session.model.offline = true;
    //        api.modals.show("server_restart");
    //    }
    //}
    //});

    api.audio = new AudioAPI().init();

    api.modals = new ModalsAPI();

    api.account = await new StoreAPI<Account>("account", accountSchema).init();

    api.game = new GameAPI(userDataDir, dataDir);

    api.content = await new ContentAPI(userDataDir, dataDir).init();
    // reactive(createDeepProxy(new Battle(defaultBattle()), (breadcrumb) => {
    //     const currentBattle = this.currentBattle;

    //     return {
    //         set(target, prop, value) {
    //             if (currentBattle.battleOptions.offline) {
    //                 target[prop as keyof typeof target] = value;
    //             } else {
    //                 // TODO: if set from server data then immediately apply
    //                 // TODO: if set from client then send server request for it
    //                 console.warn("can't set battle property directly");
    //             }
    //             return true;
    //         }
    //     };
    // }, "battle"));
}