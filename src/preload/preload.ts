import { contextBridge, ipcRenderer } from "electron";

import { Replay } from "@main/content/replays/replay";
import { Settings } from "@main/services/settings.service";
import { Account } from "@main/services/account.service";
import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Scenario } from "@main/content/game/scenario";
import { DownloadInfo } from "@main/content/downloads";
import { Info } from "@main/services/info.service";
import { NewsFeedData } from "@main/services/news.service";
import { BattleWithMetadata } from "@main/game/battle/battle-types";

const infoApi = {
    getInfo: (): Promise<Info> => ipcRenderer.invoke("info:get"),
};
export type InfoApi = typeof infoApi;
contextBridge.exposeInMainWorld("info", infoApi);

const mainWindowApi = {
    setFullscreen: (flag: boolean): Promise<void> => ipcRenderer.invoke("mainWindow:setFullscreen", flag),
    toggleFullscreen: (): Promise<void> => ipcRenderer.invoke("mainWindow:toggleFullscreen"),
    flashFrame: (flag: boolean): Promise<void> => ipcRenderer.invoke("mainWindow:flashFrame", flag),
};
export type MainWindowApi = typeof mainWindowApi;
contextBridge.exposeInMainWorld("mainWindow", mainWindowApi);

const shellApi = {
    openConfigDir: (): Promise<void> => ipcRenderer.invoke("shell:openConfigDir"),
    openContentDir: (): Promise<void> => ipcRenderer.invoke("shell:openContentDir"),
    openSettingsFile: (): Promise<void> => ipcRenderer.invoke("shell:openSettingsFile"),
    openStartScript: (): Promise<void> => ipcRenderer.invoke("shell:openStartScript"),
    openReplaysDir: (): Promise<void> => ipcRenderer.invoke("shell:openReplaysDir"),
    showReplayInFolder: (fileName: string): Promise<void> => ipcRenderer.invoke("shell:showReplayInFolder", fileName),

    // External
    openInBrowser: (url: string): Promise<void> => ipcRenderer.invoke("shell:openInBrowser", url),
};
export type ShellApi = typeof shellApi;
contextBridge.exposeInMainWorld("shell", shellApi);

const replaysApi = {
    sync: (replays: string[]): Promise<void> => ipcRenderer.invoke("replays:sync", replays),
    delete: (fileName: number): Promise<void> => ipcRenderer.invoke("replays:delete", fileName),

    // Events
    onReplayCachingStarted: (callback: (filename: string) => void) => ipcRenderer.on("replays:replayCachingStarted", (_event, filename) => callback(filename as string)),
    onReplayCached: (callback: (replay: Replay) => void) => ipcRenderer.on("replays:replayCached", (_event, replay) => callback(replay as Replay)),
    onReplayDeleted: (callback: (filename: string) => void) => ipcRenderer.on("replays:replayDeleted", (_event, filename) => callback(filename as string)),
};
export type ReplaysApi = typeof replaysApi;
contextBridge.exposeInMainWorld("replays", replaysApi);

const settingsApi = {
    getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
    updateSettings: (settings: Partial<Settings>): Promise<void> => ipcRenderer.invoke("settings:update", settings),
    toggleFullscreen: (): Promise<void> => ipcRenderer.invoke("settings:toggleFullscreen"),
};
export type SettingsApi = typeof settingsApi;
contextBridge.exposeInMainWorld("settings", settingsApi);

const accountApi = {
    getAccount: (): Promise<Account> => ipcRenderer.invoke("account:get"),
    updateAccount: (data: Partial<Account>): Promise<void> => ipcRenderer.invoke("account:update", data),
};
export type AccountApi = typeof accountApi;
contextBridge.exposeInMainWorld("account", accountApi);

const engineApi = {
    downloadEngine: (version: string): Promise<void> => ipcRenderer.invoke("engine:downloadEngine", version),
    getInstalledVersions: (): Promise<EngineVersion[]> => ipcRenderer.invoke("engine:getInstalledVersions"),
    isVersionInstalled: (id: string): Promise<boolean> => ipcRenderer.invoke("engine:isVersionInstalled", id),
    uninstallVersion: (version: EngineVersion): Promise<void> => ipcRenderer.invoke("engine:uninstallVersion", version),
};
export type EngineApi = typeof engineApi;
contextBridge.exposeInMainWorld("engine", engineApi);

const gameApi = {
    // Content
    downloadGame: (version: string): Promise<void> => ipcRenderer.invoke("game:downloadGame", version),
    getScenarios: (version: string): Promise<Scenario[]> => ipcRenderer.invoke("game:getScenarios", version),
    getInstalledVersions: (): Promise<GameVersion[]> => ipcRenderer.invoke("game:getInstalledVersions"),
    isVersionInstalled: (version: string): Promise<boolean> => ipcRenderer.invoke("game:isVersionInstalled", version),
    uninstallVersion: (version: string): Promise<void> => ipcRenderer.invoke("game:uninstallVersion", version),

    // Game
    launchScript: (script: string): Promise<void> => ipcRenderer.invoke("game:launchScript", script),
    launchReplay: (replay: Replay): Promise<void> => ipcRenderer.invoke("game:launchReplay", replay),
    launchBattle: (battle: BattleWithMetadata): Promise<void> => ipcRenderer.invoke("game:launchBattle", battle),

    // Events
    onGameLaunched: (callback: () => void) => ipcRenderer.on("game:launched", callback),
    onGameClosed: (callback: () => void) => ipcRenderer.on("game:closed", callback),
};
export type GameApi = typeof gameApi;
contextBridge.exposeInMainWorld("game", gameApi);

const mapsApi = {
    // Content
    downloadMap: (springName: string): Promise<void> => ipcRenderer.invoke("maps:downloadMap", springName),
    downloadMaps: (springNames: string[]): Promise<void> => ipcRenderer.invoke("maps:downloadMaps", springNames),
    getInstalledVersions: (): Promise<MapData[]> => ipcRenderer.invoke("maps:getInstalledVersions"),
    isVersionInstalled: (springName: string): Promise<boolean> => ipcRenderer.invoke("maps:isVersionInstalled", springName),

    // Online features
    fetchAllMaps: (): Promise<MapData[]> => ipcRenderer.invoke("maps:online:fetchAllMaps"),
    fetchMapImages: (imageSource: string): Promise<ArrayBuffer> => ipcRenderer.invoke("maps:online:fetchMapImages", imageSource),

    // Events
    onMapAdded: (callback: (filename: string) => void) => ipcRenderer.on("maps:mapAdded", (_event, filename) => callback(filename as string)),
    onMapDeleted: (callback: (filename: string) => void) => ipcRenderer.on("maps:mapDeleted", (_event, filename) => callback(filename as string)),
};
export type MapsApi = typeof mapsApi;
contextBridge.exposeInMainWorld("maps", mapsApi);

const downloadsApi = {
    // Events
    // Engine
    onDownloadEngineStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:start", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadEngineComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:complete", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadEngineProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:progress", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadEngineFailed: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:engine:fail", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    // Game
    onDownloadGameStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:start", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadGameComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:complete", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadGameProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:progress", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadGameFail: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:game:fail", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    // Maps
    onDownloadMapStart: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:start", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadMapComplete: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:complete", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadMapProgress: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:progress", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
    onDownloadMapFail: (callback: (downloadInfo: DownloadInfo) => void) => ipcRenderer.on("downloads:map:failed", (_event, downloadInfo) => callback(downloadInfo as DownloadInfo)),
};
export type DownloadsApi = typeof downloadsApi;
contextBridge.exposeInMainWorld("downloads", downloadsApi);

const miscApi = {
    getNewsRssFeed: (): Promise<NewsFeedData> => ipcRenderer.invoke("misc:getNewsRssFeed"),
};
export type MiscApi = typeof miscApi;
contextBridge.exposeInMainWorld("misc", miscApi);
