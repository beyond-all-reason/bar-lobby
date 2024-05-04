import { TachyonUser } from "tachyon-protocol";

import { BattlePlayer, BattleSpectator, Bot } from "@/model/battle/battle-types";
import { Replay } from "@/model/cache/replay";

export function isReplay(replay: unknown): replay is Replay {
    return typeof replay === "object" && replay !== null && "replayId" in replay;
}

export function isUser(user: unknown): user is TachyonUser {
    return typeof user === "object" && user !== null && "userId" in user;
}

export function isBattleUser(user: unknown): user is BattlePlayer | BattleSpectator {
    return isUser(user) && user.battleStatus !== null;
}

export function isPlayer(user: unknown): user is BattlePlayer {
    return isBattleUser(user) && user.battleStatus.isSpectator === false;
}

export function isSpectator(user: unknown): user is BattleSpectator {
    return isBattleUser(user) && user.battleStatus.isSpectator === true;
}

export function isBot(bot: unknown): bot is Bot {
    return !isUser(bot);
}
