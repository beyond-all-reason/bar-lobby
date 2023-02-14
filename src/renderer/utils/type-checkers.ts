import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/battle-types";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { Replay } from "@/model/replay";
import { User } from "@/model/user";

export function isReplay(replay: object): replay is Replay {
    return "replayId" in replay;
}
export function isBattle(battle: object): battle is AbstractBattle {
    return battle instanceof AbstractBattle;
}
export function isOfflineBattle(battle: object): battle is OfflineBattle {
    return battle instanceof OfflineBattle;
}
export function isSpadsBattle(battle: object): battle is SpadsBattle {
    return battle instanceof SpadsBattle;
}

export function isUser(user: object): user is User {
    return "username" in user;
}
export function isBot(bot: object): bot is Bot {
    return "ownerUserId" in bot;
}
