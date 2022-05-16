import { aiNames } from "@/config/ai-names";
import { defaultMaps } from "@/config/default-maps";
import { BattleConfig } from "@/model/battle/battle";
import { Team } from "@/model/battle/team";
import { StartPosType, TeamPreset } from "@/model/battle/types";
import { lastInArray, randomFromArray } from "jaz-ts-utils";
import { SetOptional } from "type-fest";

export const defaultBattle: () => SetOptional<BattleConfig, "teams"> = () => {
    const myUserId = api.session?.currentUser?.userId ?? -1;

    const teams: Team[] = [
        {},
        {}
    ];

    return {
        battleOptions: {
            offline: true,
            id: -1,
            engineVersion: lastInArray(api.content.engine.installedVersions)!,
            gameVersion: lastInArray(api.content.game.installedVersions)!.version.fullString,
            mapFileName: randomFromArray(defaultMaps)!,
            startPosType: StartPosType.Boxes,
            teamPreset: TeamPreset.Standard,
            isHost: true,
            gameOptions: {},
            mapOptions: {},
            restrictions: []
        },
        teams,
        participants: [
            { type: "player", id: 0, team: teams[0], userId: myUserId },
            { type: "bot", id: 1, team: teams[1], ownerUserId: myUserId, name: randomFromArray(aiNames)!, aiShortName: "BARb", aiOptions: {} },
        ]
    };
};