import { aiNames } from "@/config/ai-names";
import { defaultMaps } from "@/config/default-maps";
import { createBattle } from "@/model/battle/battle";
import { StartPosType } from "@/model/battle/types";
import { clone } from "@/utils/clone";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

export const defaultBattle = () => {
    const randomNames = clone(aiNames);

    return createBattle({
        battleOptions: {
            engineVersion: lastInArray(window.api.content.engine.installedVersions),
            gameVersion: lastInArray(window.api.content.game.installedVersions).version.fullString,
            mapFileName: randomFromArray(defaultMaps),
            startPosType: StartPosType.Fixed,
            isHost: true,
        },
        allyTeams: [
            {
                players: [
                    {
                        userId: -1
                    }
                ],
                bots: []
            },
            {
                players: [],
                bots: [
                    {
                        aiShortName: "BARb",
                        name: "bob",
                        ownerName: window.api.session.currentUser.username
                    },
                    {
                        aiShortName: "BARb",
                        name: "fred",
                        ownerName: window.api.session.currentUser.username
                    }
                ]
            }
        ]
    });
};