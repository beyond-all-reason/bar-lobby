import { Scenario } from "@main/content/game/scenario";
import { Replay } from "@main/content/replays/replay";

export type GetScenarios = (gameVersion: string | undefined) => Promise<Scenario[]>;
export type LaunchReplay = (replay: Replay | undefined | null) => Promise<void>;
export type DownloadEngine = (version: string | undefined) => Promise<void | string>;
