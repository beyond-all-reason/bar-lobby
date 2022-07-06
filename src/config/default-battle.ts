import { lastInArray, randomFromArray } from "jaz-ts-utils";

import { aiNames } from "@/config/ai-names";
import { defaultBoxes, defaultMapBoxes } from "@/config/default-boxes";
import { defaultMaps } from "@/config/default-maps";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { StartPosType } from "@/model/battle/types";

export const defaultBattle: () => OfflineBattle = () => {
    const me = api.session.currentUser;
    const map = randomFromArray(defaultMaps)!;

    me.battleStatus.playerId = 0;
    me.battleStatus.teamId = 0;
    me.battleStatus.isSpectator = false;

    return new OfflineBattle({
        battleOptions: {
            title: "Offline Custom Battle",
            id: -1,
            engineVersion: lastInArray(api.content.engine.installedVersions)!,
            gameVersion: lastInArray(api.content.game.installedVersions)!.version,
            map: map,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes()[map] ?? defaultBoxes().NorthVsSouth,
            isHost: true,
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        },
        userIds: [-1],
        bots: [{ playerId: 1, teamId: 1, ownerUserId: -1, name: randomFromArray(aiNames)!, aiShortName: "BARb", aiOptions: {} }],
    });
};
