/* eslint-disable @typescript-eslint/no-explicit-any */

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/battle-types";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { Replay } from "@/model/cache/replay";
import { User } from "@/model/user";

export function isReplay(replay: any): replay is Replay {
    return "replayId" in replay;
}
export function isBattle(battle: any): battle is AbstractBattle {
    return battle instanceof AbstractBattle;
}
export function isOfflineBattle(battle: any): battle is OfflineBattle {
    return battle instanceof OfflineBattle;
}
export function isSpadsBattle(battle: any): battle is SpadsBattle {
    return battle instanceof SpadsBattle;
}

export function isUser(user: any): user is User {
    return "username" in user;
}
export function isBot(bot: any): bot is Bot {
    return "ownerUserId" in bot;
}
