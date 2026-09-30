// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { LobbyStartboxes } from "@renderer/utils/lobby-startboxes";
import { LobbyCreateOkResponse } from "tachyon-protocol/types";

export type Lobby = LobbyCreateOkResponse["data"] & {
    maxPlayerCount: number;
    playerCount: number;
    spectatorCount: number;
    playerQueue: Map<number, string>;
    botCount: number;
    startboxes?: LobbyStartboxes;
};
