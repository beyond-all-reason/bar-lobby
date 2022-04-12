import { defaultMaps } from "@/config/default-maps";
import { createBattle } from "@/model/battle/battle";
import { StartPosType } from "@/model/battle/types";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

export const defaultBattle = () => {
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