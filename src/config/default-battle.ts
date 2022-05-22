import { lastInArray, randomFromArray } from "jaz-ts-utils";

import { aiNames } from "@/config/ai-names";
import { defaultBoxes, defaultMapBoxes } from "@/config/default-boxes";
import { defaultMaps } from "@/config/default-maps";
import { BattleConfig } from "@/model/battle/battle";
import { StartPosType, TeamPreset } from "@/model/battle/types";

export const defaultBattle: () => BattleConfig = () => {
    const myUserId = api.session?.currentUser?.userId ?? -1;
    const map = randomFromArray(defaultMaps)!;

    return {
        battleOptions: {
            offline: true,
            id: -1,
            engineVersion: lastInArray(api.content.engine.installedVersions)!,
            gameVersion: lastInArray(api.content.game.installedVersions)!.version.fullString,
            mapFileName: map,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes()[map] ?? defaultBoxes().NorthVsSouth,
            teamPreset: TeamPreset.Standard,
            isHost: true,
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        },
        participants: [
            { type: "player", id: 0, teamId: 0, userId: myUserId },
            { type: "bot", id: 1, teamId: 1, ownerUserId: myUserId, name: randomFromArray(aiNames)!, aiShortName: "BARb", aiOptions: {} },
        ],
    };
};
