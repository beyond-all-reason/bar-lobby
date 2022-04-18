import { aiNames } from "@/config/ai-names";
import { defaultMaps } from "@/config/default-maps";
import { BattleConfig } from "@/model/battle/battle";
import { StartPosType } from "@/model/battle/types";
import { lastInArray, randomFromArray, shuffle } from "jaz-ts-utils";
import { SetOptional } from "type-fest";

export const defaultBattle: () => SetOptional<BattleConfig, "allyTeams" | "gameOptions" | "mapOptions" | "restrictions"> = () => {
    const randomNames = shuffle(aiNames);
    const myUserId = window.api.session?.currentUser?.userId ?? -1;

    return {
        battleOptions: {
            offline: true,
            engineVersion: lastInArray(window.api.content.engine.installedVersions),
            gameVersion: lastInArray(window.api.content.game.installedVersions).version.fullString,
            mapFileName: randomFromArray(defaultMaps),
            startPosType: StartPosType.Fixed,
            isHost: true,
        },
        allyTeams: [
            { id: 0 },
            { id: 1 },
        ],
        participants: [
            { type: "player", allyTeamId: 0, userId: myUserId },
            { type: "bot", allyTeamId: 1, ownerUserId: myUserId, name: randomNames.shift()!, aiShortName: "BARb" },
            { type: "bot", allyTeamId: 1, ownerUserId: myUserId, name: randomNames.shift()!, aiShortName: "BARb" },
        ]
    };
};