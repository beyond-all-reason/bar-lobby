// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Scenario } from "@main/content/game/scenario";
import { Replay } from "@main/content/replays/replay";

export type GetScenarios = (gameVersion: string | undefined) => Promise<Scenario[]>;
export type LaunchReplay = (replay: Replay) => Promise<void>;
export type DownloadEngine = (version: string | undefined) => Promise<void | string>;
