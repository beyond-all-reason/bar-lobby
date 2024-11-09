import { AccountApi, DownloadsApi, EngineApi, GameApi, InfoApi, MainWindowApi, MapsApi, MiscApi, ReplaysApi, SettingsApi, ShellApi, UnitsApi } from "@preload/preload";

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
        units: UnitsApi;
        downloads: DownloadsApi;
        misc: MiscApi;
    }
}
