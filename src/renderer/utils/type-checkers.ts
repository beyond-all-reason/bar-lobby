import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/types";
import { Replay } from "@/model/replay";
import { User } from "@/model/user";

export const isReplay = (replay: any): replay is Replay => "replayId" in replay;
export const isBattle = (battle: any): battle is AbstractBattle => battle instanceof AbstractBattle;

export const isUser = (user: any): user is User => "username" in user;
export const isBot = (bot: any): bot is Bot => "ownerUserId" in bot;
