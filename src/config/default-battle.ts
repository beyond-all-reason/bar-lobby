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
            id: -1,
            title: "Offline Custom Battle",
            founderId: me.userId,
            locked: false,
            maxPlayers: 1,
            passworded: false,
            password: null,
            scriptPassword: null,
            startTime: null,
            engineVersion: lastInArray(api.content.engine.installedVersions)!,
            gameVersion: lastInArray(api.content.game.installedVersions)!.version,
            map: map,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes()[map] ?? defaultBoxes().NorthVsSouth,
            isHost: true,
            ip: null,
            port: null,
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        },
        userIds: [me.userId],
        bots: [{ playerId: 1, teamId: 1, ownerUserId: me.userId, name: randomFromArray(aiNames)!, aiShortName: "BARb", aiOptions: {} }],
    });
};
