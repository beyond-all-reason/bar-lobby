import type { AccountApi, DownloadsApi, EngineApi, GameApi, InfoApi, MainWindowApi, MapsApi, MiscApi, ReplaysApi, SettingsApi, ShellApi } from "@preload/preload";
import type { TransitionProps } from "vue";

declare global {
    interface Window {
        info: InfoApi;
        shell: ShellApi;
        mainWindow: MainWindowApi;
        replays: ReplaysApi;
        account: AccountApi;
        settings: SettingsApi;
        engine: EngineApi;
        game: GameApi;
        maps: MapsApi;
        downloads: DownloadsApi;
        misc: MiscApi;
    }
}

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        availableOffline?: boolean;
        hide?: boolean;
        empty?: boolean;
        blurBg?: boolean;
        transition?: TransitionProps;
        overflowY?: "scroll" | "hidden";
        devOnly?: boolean;
        redirect?: string;
    }
}
