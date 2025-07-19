// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { BattleWithMetadata } from "@main/game/battle/battle-types";
import type { DownloadInfo } from "@main/content/downloads";
import type { EngineVersion } from "@main/content/engine/engine-version";
import type { GameVersion } from "@main/content/game/game-version";
import type { Info } from "@main/services/info.service";
import type { IpcMain, IpcMainEvent, IpcMainInvokeEvent, IpcRenderer, IpcRendererEvent, WebContents } from "electron";
import type { logLevels } from "@main/services/log.service";
import type { MapData, MapDownloadData } from "@main/content/maps/map-data";
import type { MultiplayerLaunchSettings } from "@main/game/game";
import type { NewsFeedData } from "@main/services/news.service";
import type { Replay } from "@main/content/replays/replay";
import type { Scenario } from "@main/content/game/scenario";
import type { Settings } from "@main/services/settings.service";
import type { TachyonEvent, TachyonResponse } from "tachyon-protocol";
import { ipcRenderer as electronIpcRenderer, ipcMain as electronIpcMain } from "electron";

export type IPCEvents = {
    "downloads:update:progress": (downloadInfo: DownloadInfo) => void;
    "downloads:engine:complete": (downloadInfo: DownloadInfo) => void;
    "downloads:engine:fail": (downloadInfo: DownloadInfo) => void;
    "downloads:engine:progress": (downloadInfo: DownloadInfo) => void;
    "downloads:engine:start": (downloadInfo: DownloadInfo) => void;
    "downloads:game:complete": (downloadInfo: DownloadInfo) => void;
    "downloads:game:fail": (downloadInfo: DownloadInfo) => void;
    "downloads:game:progress": (downloadInfo: DownloadInfo) => void;
    "downloads:game:start": (downloadInfo: DownloadInfo) => void;
    "downloads:map:complete": (downloadInfo: DownloadInfo) => void;
    "downloads:map:fail": (downloadInfo: DownloadInfo) => void;
    "downloads:map:progress": (downloadInfo: DownloadInfo) => void;
    "downloads:map:start": (downloadInfo: DownloadInfo) => void;
    "game:closed": () => void;
    "game:launched": () => void;
    "maps:mapAdded": (filename: string) => void;
    "maps:mapDeleted": (filename: string) => void;
    "navigation:navigateTo": (target: string) => void;
    "notifications:showAlert": (alertConfig: { text: string; severity?: "info" | "warning" | "error"; timeoutMs?: number }) => void;
    "replays:replayCached": (replay: Replay) => Replay;
    "replays:replayCachingStarted": (filename: string) => void;
    "replays:replayDeleted": (filename: string) => void;
    "replays:highlightOpened": (fileNames: string[]) => void;
    "tachyon:battleStart": (springString: string) => void;
    "tachyon:connected": () => void;
    "tachyon:disconnected": () => void;
    "tachyon:event": (event: TachyonEvent) => void;
};

export type IPCCommands = {
    "auth:hasCredentials": () => boolean;
    "auth:login": () => void;
    "auth:logout": () => void;
    "auth:wipe": () => void;
    "autoUpdater:checkForUpdates": () => boolean;
    "autoUpdater:downloadUpdate": () => void;
    "autoUpdater:installUpdates": () => void;
    "autoUpdater:quitAndInstall": () => void;
    "engine:downloadEngine": (version: string) => string | void;
    "engine:isVersionInstalled": (id: string) => boolean;
    "engine:listAvailableVersions": () => EngineVersion[];
    "engine:uninstallVersion": (version: EngineVersion) => void;
    "game:downloadGame": (version: string) => void;
    "game:getInstalledVersions": () => GameVersion[];
    "game:getScenarios": (version: string) => Scenario[];
    "game:isVersionInstalled": (version: string) => boolean;
    "game:launchBattle": (battle: BattleWithMetadata) => Promise<void>;
    "game:launchMultiplayer": (settings: MultiplayerLaunchSettings) => void;
    "game:launchReplay": (replay: Replay) => Promise<void>;
    "game:launchScript": (script: string, gameVersion: string, engineVersion: string) => void;
    "game:preloadPoolData": () => void;
    "game:uninstallVersion": (version: string) => void;
    "info:get": () => Info;
    "log:log": (fileName: string, level: logLevels, msg: string) => void;
    "log:pack": () => string;
    "log:purge": () => string[];
    "log:upload": () => string;
    "mainWindow:flashFrame": (flag: boolean) => void;
    "mainWindow:setFullscreen": (flag: boolean, size: number) => void;
    "mainWindow:setSize": (size: number) => void;
    "mainWindow:minimize": () => void;
    "mainWindow:isFullscreen": () => boolean;
    "maps:attemptCacheErrorMaps": () => void;
    "maps:downloadMap": (springName: string) => void;
    "maps:downloadMaps": (springNames: string[]) => void[];
    "maps:getInstalledVersions": () => Map<string, MapData>;
    "maps:isVersionInstalled": (springName: string) => boolean;
    "maps:online:fetchAllMaps": () => [MapData[], MapDownloadData[]];
    "maps:online:fetchMapImages": (imageSource: string) => ArrayBuffer;
    "misc:getDevlogRssFeed": (numberOfNews: number) => NewsFeedData | null | undefined;
    "misc:getNewsRssFeed": (numberOfNews: number) => NewsFeedData | null | undefined;
    "renderer:ready": () => void;
    "replays:delete": (fileName: string) => void;
    "replays:sync": (replays: string[]) => void;
    "settings:get": () => Settings;
    "settings:toggleFullscreen": () => void;
    "settings:update": (settings: Partial<Settings>) => Partial<Settings>;
    "shell:openStateDir": () => string;
    "shell:openAssetsDir": () => string;
    "shell:openInBrowser": (url: string) => void;
    "shell:openReplaysDir": () => string;
    "shell:openSettingsFile": () => string;
    "shell:openStartScript": () => string;
    "shell:showReplayInFolder": (fileName: string) => void;
    "tachyon:connect": () => void;
    "tachyon:disconnect": () => void;
    "tachyon:isConnected": () => boolean;
    "tachyon:sendEvent": (event: TachyonEvent) => void;
    "tachyon:request": (...args: unknown[]) => Promise<TachyonResponse>;
};

type Awaitable<T> = T | Promise<T>;
type FnMapping = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: (...args: any) => any;
};

export interface TypedIpcMain<IpcEvents extends FnMapping, IpcCommands extends FnMapping> extends IpcMain {
    on<K extends keyof IpcEvents>(channel: K, listener: (event: IpcMainEvent, ...args: Parameters<IpcEvents[K]>) => void): this;
    handle<K extends keyof IpcCommands>(channel: K, listener: (event: IpcMainInvokeEvent, ...args: Parameters<IpcCommands[K]>) => Awaitable<ReturnType<IpcCommands[K]>>): void;
}

export interface TypedIpcRenderer<IpcEvents extends FnMapping, IpcCommands extends FnMapping> extends IpcRenderer {
    on<K extends keyof IpcEvents>(channel: K, listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void): this;
    send<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void;
    invoke<K extends keyof IpcCommands>(channel: K, ...args: Parameters<IpcCommands[K]>): Promise<ReturnType<IpcCommands[K]>>;
}

export interface TypedWebContents<IpcEvents extends FnMapping, IpcCommands extends FnMapping> extends WebContents {
    send<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void;
    ipc: TypedIpcMain<IpcEvents, IpcCommands>;
}

export type BarIpcMain = TypedIpcMain<IPCEvents, IPCCommands>;
export type BarIpcRenderer = TypedIpcRenderer<IPCEvents, IPCCommands>;
export type BarIpcWebContents = TypedWebContents<IPCEvents, IPCCommands>;

export const ipcRenderer = electronIpcRenderer as BarIpcRenderer;
export const ipcMain = electronIpcMain as BarIpcMain;
export const typedWebContents = (webContents: WebContents) => webContents as BarIpcWebContents;
