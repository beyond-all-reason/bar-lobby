import { lastInArray, randomFromArray } from "jaz-ts-utils";

import { aiNames } from "@/config/ai-names";
import { defaultBoxes, defaultMapBoxes } from "@/config/default-boxes";
import { defaultMaps } from "@/config/default-maps";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { StartPosType } from "@/model/battle/types";

export const defaultBattle: (mapScriptName?: string) => OfflineBattle = (mapScriptName) => {
    const me = api.session.offlineUser;
    const map = mapScriptName ?? randomFromArray(defaultMaps)!;

    me.battleStatus.playerId = 0;
    me.battleStatus.teamId = 0;
    me.battleStatus.isSpectator = false;

    return new OfflineBattle({
        battleOptions: {
            title: "Offline Custom Battle",
            startTime: null,
            engineVersion: lastInArray(api.content.engine.installedVersions)!,
            gameVersion: Array.from(api.content.game.installedVersions).pop()!,
            map: map,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes()[map] ?? defaultBoxes().NorthVsSouth,
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        },
        users: [me],
        bots: [{ playerId: 1, teamId: 1, ownerUserId: me.userId, name: randomFromArray(aiNames)!, aiShortName: "BARb", aiOptions: {} }],
    });
};
