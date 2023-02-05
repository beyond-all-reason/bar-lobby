import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { Bot } from "@/model/battle/types";
import { Replay } from "@/model/replay";
import { User } from "@/model/user";

export const isReplay = (replay: any): replay is Replay => "replayId" in replay;
export const isBattle = (battle: any): battle is AbstractBattle => battle instanceof AbstractBattle;
export const isOfflineBattle = (battle: any): battle is OfflineBattle => battle instanceof OfflineBattle;
export const isSpadsBattle = (battle: any): battle is SpadsBattle => battle instanceof SpadsBattle;

export const isUser = (user: any): user is User => "username" in user;
export const isBot = (bot: any): bot is Bot => "ownerUserId" in bot;
