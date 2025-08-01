// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type {
    AuthApi,
    AutoUpdaterApi,
    BarNavigationApi,
    DownloadsApi,
    EngineApi,
    GameApi,
    InfoApi,
    LogApi,
    MainWindowApi,
    MapsApi,
    MiscApi,
    ReplaysApi,
    SettingsApi,
    ShellApi,
    TachyonApi,
} from "@preload/preload";
import type { TransitionProps } from "vue";

declare global {
    interface Window {
        info: InfoApi;
        shell: ShellApi;
        mainWindow: MainWindowApi;
        replays: ReplaysApi;
        auth: AuthApi;
        settings: SettingsApi;
        engine: EngineApi;
        game: GameApi;
        maps: MapsApi;
        downloads: DownloadsApi;
        misc: MiscApi;
        tachyon: TachyonApi;
        log: LogApi;
        autoUpdater: AutoUpdaterApi;
        barNavigation: BarNavigationApi;
        notifications: NotificationsApi;
    }
}

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        onlineOnly?: boolean;
        hide?: boolean;
        empty?: boolean;
        blurBg?: boolean;
        transition?: TransitionProps;
        overflowY?: "scroll" | "hidden";
        devOnly?: boolean;
        redirect?: string;
    }
}
