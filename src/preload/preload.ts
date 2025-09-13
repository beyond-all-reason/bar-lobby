// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { contextBridge } from "electron";
import { ipcRenderer } from "@main/typed-ipc";
import { Replay } from "@main/content/replays/replay";
import { Settings } from "@main/services/settings.service";
import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { MapData, MapDownloadData } from "@main/content/maps/map-data";
import { DownloadInfo } from "@main/content/downloads";
import { Info } from "@main/services/info.service";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { GetCommandData, GetCommandIds, GetCommands } from "tachyon-protocol";
import { MultiplayerLaunchSettings } from "@main/game/game";
import { logLevels } from "@main/services/log.service";

const logApi = {
    purge: (): Promise<string[]> => ipcRenderer.invoke("log:purge"),
    pack: (): Promise<string> => ipcRenderer.invoke("log:pack"),
    upload: (): Promise<string> => ipcRenderer.invoke("log:upload"),
    log: (fileName: string, level: logLevels, msg: string): Promise<void> => ipcRenderer.invoke("log:log", fileName, level, msg),
};
export type LogApi = typeof logApi;
contextBridge.exposeInMainWorld("log", logApi);

const infoApi = {
    getInfo: (): Promise<Info> => ipcRenderer.invoke("info:get"),
};
export type InfoApi = typeof infoApi;
contextBridge.exposeInMainWorld("info", infoApi);

const mainWindowApi = {
    setFullscreen: (flag: boolean): Promise<void> => ipcRenderer.invoke("mainWindow:setFullscreen", flag),
    setSize: (size: number): Promise<void> => ipcRenderer.invoke("mainWindow:setSize", size),
    flashFrame: (flag: boolean): Promise<void> => ipcRenderer.invoke("mainWindow:flashFrame", flag),
    minimize: (): Promise<void> => ipcRenderer.invoke("mainWindow:minimize"),
    isFullscreen: (): Promise<boolean> => ipcRenderer.invoke("mainWindow:isFullscreen"),
    resized: (): Promise<void> => ipcRenderer.invoke("mainWindow:resized"),
};
export type MainWindowApi = typeof mainWindowApi;
contextBridge.exposeInMainWorld("mainWindow", mainWindowApi);

const shellApi = {
    openStateDir: (): Promise<string> => ipcRenderer.invoke("shell:openStateDir"),
    openAssetsDir: (): Promise<string> => ipcRenderer.invoke("shell:openAssetsDir"),
    openSettingsFile: (): Promise<string> => ipcRenderer.invoke("shell:openSettingsFile"),
    openStartScript: (): Promise<string> => ipcRenderer.invoke("shell:openStartScript"),
    openReplaysDir: (): Promise<string> => ipcRenderer.invoke("shell:openReplaysDir"),
    showReplayInFolder: (fileName: string): Promise<void> => ipcRenderer.invoke("shell:showReplayInFolder", fileName),

    // External
    openInBrowser: (url: string): Promise<void> => ipcRenderer.invoke("shell:openInBrowser", url),
};
export type ShellApi = typeof shellApi;
contextBridge.exposeInMainWorld("shell", shellApi);

const replaysApi = {
    sync: (replays: string[]): Promise<void> => ipcRenderer.invoke("replays:sync", replays),
    delete: (fileName: string): Promise<void> => ipcRenderer.invoke("replays:delete", fileName),

    // Events
    onReplayCachingStarted: (callback: (filename: string) => void) => ipcRenderer.on("replays:replayCachingStarted", (_event, filename) => callback(filename)),
    onReplayCached: (callback: (replay: Replay) => void) => ipcRenderer.on("replays:replayCached", (_event, replay) => callback(replay)),
    onReplayDeleted: (callback: (filename: string) => void) => ipcRenderer.on("replays:replayDeleted", (_event, filename) => callback(filename)),
    onHighlightOpened: (callback: (fileNames: string[]) => void) => ipcRenderer.on("replays:highlightOpened", (_event, fileNames) => callback(fileNames)),
};
export type ReplaysApi = typeof replaysApi;
contextBridge.exposeInMainWorld("replays", replaysApi);

const settingsApi = {
    getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
    updateSettings: (settings: Partial<Settings>): Promise<Partial<Settings>> => ipcRenderer.invoke("settings:update", settings),
    toggleFullscreen: (): Promise<void> => ipcRenderer.invoke("settings:toggleFullscreen"),
};
export type SettingsApi = typeof settingsApi;
contextBridge.exposeInMainWorld("settings", settingsApi);

const authApi = {
    login: (): Promise<void> => ipcRenderer.invoke("auth:login"),
    logout: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
    wipe: (): Promise<void> => ipcRenderer.invoke("auth:wipe"),
    hasCredentials: (): Promise<boolean> => ipcRenderer.invoke("auth:hasCredentials"),
};
export type AuthApi = typeof authApi;
contextBridge.exposeInMainWorld("auth", authApi);

const engineApi = {
    listAvailableVersions: (): Promise<EngineVersion[]> => ipcRenderer.invoke("engine:listAvailableVersions"),
    downloadEngine: (version?: string): Promise<void | string> => ipcRenderer.invoke("engine:downloadEngine", version),
    isVersionInstalled: (id: string): Promise<boolean> => ipcRenderer.invoke("engine:isVersionInstalled", id),
    uninstallVersion: (version: EngineVersion): Promise<void> => ipcRenderer.invoke("engine:uninstallVersion", version),
};
export type EngineApi = typeof engineApi;
contextBridge.exposeInMainWorld("engine", engineApi);

const gameApi = {
    // Content
    downloadGame: (version: string): Promise<void> => ipcRenderer.invoke("game:downloadGame", version),
    getScenarios: (version: string) => ipcRenderer.invoke("game:getScenarios", version),
    getInstalledVersions: (): Promise<GameVersion[]> => ipcRenderer.invoke("game:getInstalledVersions"),
    isVersionInstalled: (version: string): Promise<boolean> => ipcRenderer.invoke("game:isVersionInstalled", version),
    uninstallVersion: (version: string): Promise<void> => ipcRenderer.invoke("game:uninstallVersion", version),
    preloadPoolData: (): Promise<void> => ipcRenderer.invoke("game:preloadPoolData"),

    // Game
    launchMultiplayer: (settings: MultiplayerLaunchSettings): Promise<void> => ipcRenderer.invoke("game:launchMultiplayer", settings),
    launchScript: (script: string, gameVersion: string, engineVersion: string): Promise<void> => ipcRenderer.invoke("game:launchScript", script, gameVersion, engineVersion),
    launchReplay: (replay) => ipcRenderer.invoke("game:launchReplay", replay),
    launchBattle: (battle: BattleWithMetadata) => ipcRenderer.invoke("game:launchBattle", battle),

    // Events
    onGameLaunched: (callback: () => void) => ipcRenderer.on("game:launched", callback),
    onGameClosed: (callback: () => void) => ipcRenderer.on("game:closed", callback),
};
export type GameApi = typeof gameApi;
contextBridge.exposeInMainWorld("game", gameApi);

const mapsApi = {
    // Content
    downloadMap: (springName: string): Promise<void> => ipcRenderer.invoke("maps:downloadMap", springName),
    downloadMaps: (springNames: string[]): Promise<void[]> => ipcRenderer.invoke("maps:downloadMaps", springNames),
    getInstalledVersions: (): Promise<Map<string, MapData>> => ipcRenderer.invoke("maps:getInstalledVersions"),
    isVersionInstalled: (springName: string): Promise<boolean> => ipcRenderer.invoke("maps:isVersionInstalled", springName),

    // Online features
    fetchAllMaps: (): Promise<[MapData[], MapDownloadData[]]> => ipcRenderer.invoke("maps:online:fetchAllMaps"),
    fetchMapImages: (imageSource: string): Promise<ArrayBuffer | undefined> => ipcRenderer.invoke("maps:online:fetchMapImages", imageSource),

    // Events
    onMapAdded: (callback: (filename: string) => void) => ipcRenderer.on("maps:mapAdded", (_event, filename) => callback(filename)),
    onMapDeleted: (callback: (filename: string) => void) => ipcRenderer.on("maps:mapDeleted", (_event, filename) => callback(filename)),
};
export type MapsApi = typeof mapsApi;
contextBridge.exposeInMainWorld("maps", mapsApi);

const downloadsApi = {
    // Events
    // Engine
    onDownloadEngineStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:start", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadEngineComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:complete", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadEngineProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:progress", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadEngineFail: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:fail", (_event, downloadInfo) => callback(downloadInfo)),
    // Game
    onDownloadGameStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:start", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadGameComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:complete", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadGameProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:progress", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadGameFail: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:fail", (_event, downloadInfo) => callback(downloadInfo)),
    // Maps
    onDownloadMapStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:start", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadMapComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:complete", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadMapProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:progress", (_event, downloadInfo) => callback(downloadInfo)),
    onDownloadMapFail: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:fail", (_event, downloadInfo) => callback(downloadInfo)),
};
export type DownloadsApi = typeof downloadsApi;
contextBridge.exposeInMainWorld("downloads", downloadsApi);

const miscApi = {
    getNewsRssFeed: (numberOfNews) => ipcRenderer.invoke("misc:getNewsRssFeed", numberOfNews),
    getDevlogRssFeed: (numberOfNews) => ipcRenderer.invoke("misc:getDevlogRssFeed", numberOfNews),
};
export type MiscApi = typeof miscApi;
contextBridge.exposeInMainWorld("misc", miscApi);

const barNavigationApi = {
    onNavigateTo: (callback: (target: string) => void) => ipcRenderer.on("navigation:navigateTo", (_event, target) => callback(target)),
    signalReady: (): Promise<void> => ipcRenderer.invoke("renderer:ready"),
};

export type BarNavigationApi = typeof barNavigationApi;
contextBridge.exposeInMainWorld("barNavigation", barNavigationApi);

// Tachyon API
function request<C extends GetCommandIds<"user", "server", "request">>(
    ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
): Promise<Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>> {
    // The return value is a generic TachyonResponse in the IPC interface.
    // For consumers we cast it to the correct type based on the commandId.
    return ipcRenderer.invoke("tachyon:request", ...args) as Promise<Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>>;
}

function onEvent<C extends GetCommandIds<"server", "user", "event">>(eventID: C, callback: (event: GetCommandData<GetCommands<"server", "user", "event", C>>) => void) {
    ipcRenderer.setMaxListeners(20);

    return ipcRenderer.on("tachyon:event", (_event, event) => {
        if (event.commandId === eventID && "data" in event) {
            // event is a generic TachyonEvent in the IPC interface.
            // For consumers we cast it to the correct type based on the eventID.
            callback(event.data as GetCommandData<GetCommands<"server", "user", "event", C>>);
        }
    });
}

const tachyonApi = {
    isConnected: (): Promise<boolean> => ipcRenderer.invoke("tachyon:isConnected"),
    connect: (): Promise<void> => ipcRenderer.invoke("tachyon:connect"),
    disconnect: (): Promise<void> => ipcRenderer.invoke("tachyon:disconnect"),

    // Requests
    // sendEvent: (event: TachyonEvent) => ipcRenderer.invoke("tachyon:sendEvent", event),
    request,

    // Events
    onConnected: (callback: () => void) => ipcRenderer.on("tachyon:connected", callback),
    onDisconnected: (callback: () => void) => ipcRenderer.on("tachyon:disconnected", callback),
    onEvent,
    onBattleStart: (callback: (springString: string) => void) => ipcRenderer.on("tachyon:battleStart", (_event, springString) => callback(springString)),
};
export type TachyonApi = typeof tachyonApi;
contextBridge.exposeInMainWorld("tachyon", tachyonApi);

const autoUpdaterApi = {
    checkForUpdates: (): Promise<boolean> => ipcRenderer.invoke("autoUpdater:checkForUpdates"),
    downloadUpdate: (): Promise<void> => ipcRenderer.invoke("autoUpdater:downloadUpdate"),
    quitAndInstall: (): Promise<void> => ipcRenderer.invoke("autoUpdater:quitAndInstall"),
    installUpdates: (): Promise<void> => ipcRenderer.invoke("autoUpdater:installUpdates"),

    // Events
    onDownloadUpdateProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:update:progress", (_event, downloadInfo: DownloadInfo) => callback(downloadInfo)),
};
export type AutoUpdaterApi = typeof autoUpdaterApi;
contextBridge.exposeInMainWorld("autoUpdater", autoUpdaterApi);

const notificationsApi = {
    // Events
    onShowAlert: (callback: (alertConfig: { text: string; severity?: "info" | "warning" | "error"; timeoutMs?: number }) => void) =>
        ipcRenderer.on("notifications:showAlert", (_event, alertConfig) => callback(alertConfig)),
};
export type NotificationsApi = typeof notificationsApi;
contextBridge.exposeInMainWorld("notifications", notificationsApi);
