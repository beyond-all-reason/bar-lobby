import { ipcRenderer } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TachyonClient } from "tachyon-client";

import { AudioAPI } from "@/api/audio";
import { CommsAPI } from "@/api/comms";
import { ContentAPI } from "@/api/content/content";
import { GameAPI } from "@/api/game";
import { SessionAPI } from "@/api/session";
import { StoreAPI } from "@/api/store";
import { serverConfig } from "@/config/server";
import type { Account } from "@/model/account";
import { accountSchema } from "@/model/account";
import type { Info } from "@/model/info";
import type { SettingsType } from "@/model/settings";
import { settingsSchema } from "@/model/settings";

interface API {
    info: Info;
    session: SessionAPI;
    settings: StoreAPI<SettingsType>;
    comms: TachyonClient;
    audio: AudioAPI;
    account: StoreAPI<Account>;
    content: ContentAPI;
    game: GameAPI;
    utils: typeof utils;
}

declare global {
    const api: API;
    interface Window {
        api: API;
    }
}

export async function apiInit() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.api = {} as any;

    api.info = await ipcRenderer.invoke("getInfo");

    api.utils = utils;

    api.settings = await new StoreAPI<SettingsType>("settings", settingsSchema, true).init();

    if (!fs.existsSync(api.settings.model.dataDir.value)) {
        if (process.platform === "win32") {
            api.settings.model.dataDir.value = path.join(os.homedir(), "Documents", "My Games", "Beyond All Reason");
        } else if (process.platform === "linux") {
            api.settings.model.dataDir.value = path.join(os.homedir(), ".beyond-all-reason");
        }
    }

    await fs.promises.mkdir(api.settings.model.dataDir.value, {
        recursive: true,
    });

    const userDataDir = api.info.userDataPath;
    const dataDir = api.settings.model.dataDir.value;

    api.session = new SessionAPI();

    api.comms = new CommsAPI(serverConfig);

    api.audio = new AudioAPI().init();

    api.account = await new StoreAPI<Account>("account", accountSchema).init();

    api.game = new GameAPI(userDataDir, dataDir);

    api.content = await new ContentAPI(userDataDir, dataDir).init();
}

const utils = {
    highlightTaskbarIcon: (flash = true) => ipcRenderer.invoke("highlightTaskbarIcon", flash),
} as const;
