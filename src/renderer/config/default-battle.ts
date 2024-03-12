import { randomFromArray } from "jaz-ts-utils";

import { defaultMaps } from "@/config/default-maps";
import { defaultEngineVersion, defaultGameVersion } from "@/config/default-versions";
import { BattlePlayer, StartPosType } from "@/model/battle/battle-types";
import { OfflineCustomBattle } from "@/model/battle/offline-custom-battle";
import { defaultMapBoxes } from "@/utils/start-boxes";

export function defaultBattle(mapScriptName?: string) {
    const me = api.session.offlineUser;
    const map = mapScriptName ?? randomFromArray(defaultMaps)!;

    me.battleStatus = {
        battleId: -1,
        playerId: 0,
        teamId: 0,
        isSpectator: false,
        bonus: 0,
        color: "#f00",
        inGame: false,
        isBot: false,
        ready: true,
        sync: {
            engine: 0,
            game: 0,
            map: 0,
        },
    };

    const engine = api.content.engine.installedVersions.find((version) => version.id === defaultEngineVersion);
    const barb = engine?.ais.find((ai) => ai.shortName === "BARb");

    return new OfflineCustomBattle({
        battleOptions: {
            title: "Offline Custom Battle",
            startTime: null,
            engineVersion: defaultEngineVersion,
            gameVersion: defaultGameVersion,
            map: map,
            startPosType: StartPosType.Boxes,
            startBoxes: defaultMapBoxes(map),
            gameOptions: {},
            mapOptions: {},
            restrictions: [],
        },
        users: [me as BattlePlayer],
        bots: barb ? [{ playerId: 1, teamId: 1, ownerUserId: me.userId, name: barb.name, aiShortName: barb.shortName, aiOptions: {} }] : [],
    });
}
