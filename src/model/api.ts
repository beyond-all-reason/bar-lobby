import { AlertsAPI } from "@/api/alerts";
import { AudioAPI } from "@/api/audio";
import { GameAPI } from "@/api/game";
import { ContentAPI } from "@/api/content";
import { ModalsAPI } from "@/api/modals";
import { StoreAPI } from "@/api/store";
import { Account } from "@/model/account";
import { Info } from "@/model/info";
import { SettingsType } from "@/model/settings";
import { TachyonClient } from "tachyon-client";
import { WorkersAPI } from "@/api/workers";
import { SessionAPI } from "@/api/session";

declare global {
    interface Window {
        info: Info;
        api: API;
    }

    interface API {
        session: SessionAPI;
        settings: StoreAPI<SettingsType>;
        client: TachyonClient;
        audio: AudioAPI;
        /** @deprecated - replace with modals */
        alerts: AlertsAPI;
        modals: ModalsAPI;
        accounts: StoreAPI<Account>;
        content: ContentAPI;
        game: GameAPI;
        workers: WorkersAPI;
    }
}
