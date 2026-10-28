// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";
import type { SaveChange, ReportedResult } from "@shared/content/save";
import type { SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

export const singleplayerApi = {
    // Rescans the content roots, so content added since the last call shows up.
    list: () => ipcCall("singleplayer:list", () => window.singleplayer.list()),
    getSaves: () => ipcCall("singleplayer:getSaves", () => window.singleplayer.getSaves()),
    // Returns the save as written.
    recordResult: (kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef, result: ReportedResult) =>
        ipcCall("singleplayer:recordResult", () => window.singleplayer.recordResult(kind, source, rootId, id, result)),
    deleteAllSaves: () => ipcCall("singleplayer:deleteAllSaves", () => window.singleplayer.deleteAllSaves()),
    // Every change to a save, including ones main made itself. Gives the function that unsubscribes.
    onSaveChanged: (handler: (change: SaveChange) => void) => window.singleplayer.onSaveChanged(handler),
    deleteSave: (kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) => ipcCall("singleplayer:deleteSave", () => window.singleplayer.deleteSave(kind, source, rootId, id)),
};
