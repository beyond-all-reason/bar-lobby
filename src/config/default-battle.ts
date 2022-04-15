import { aiNames } from "@/config/ai-names";
import { defaultMaps } from "@/config/default-maps";
import { createBattle } from "@/model/battle/battle";
import { StartPosType } from "@/model/battle/types";
import { lastInArray, randomFromArray, shuffle } from "jaz-ts-utils";

export const defaultBattle = () => {
    const randomNames = shuffle(aiNames);

    return createBattle({
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
            { type: "player", allyTeamId: 0, id: 0, userId: window.api.session.currentUser.userId },
            { type: "bot", allyTeamId: 1, id: 0, ownerId: 0, name: randomNames.shift()!, aiShortName: "BARb" },
            { type: "bot", allyTeamId: 1, id: 1, ownerId: 0, name: randomNames.shift()!, aiShortName: "BARb" },
        ]
    });
};