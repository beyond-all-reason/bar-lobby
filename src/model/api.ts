import { AlertsAPI } from "@/api/alerts";
import { AudioAPI } from "@/api/audio";
import { GameAPI } from "@/api/game";
import { ContentAPI } from "@/api/content";
import { ModalsAPI } from "@/api/modals";
import { StoreAPI } from "@/api/store";
import { AccountType } from "@/model/account";
import { Info } from "@/model/info";
import { SessionType } from "@/model/session";
import { SettingsType } from "@/model/settings";
import { TachyonClient } from "tachyon-client";
import { ToRefs } from "vue";

declare global {
    interface Window {
        info: Info;
        api: API;
    }

    interface API {
        session: ToRefs<SessionType>;
        settings: StoreAPI<SettingsType>;
        client: TachyonClient;
        audio: AudioAPI;
        /** @deprecated - replace with modals */
        alerts: AlertsAPI;
        modals: ModalsAPI;
        accounts: StoreAPI<AccountType>;
        content: ContentAPI;
        game: GameAPI;
    }
}
