import { defaultMaps } from "@/config/default-maps";
import { Battle } from "@/model/battle/battle";
import { StartPosType } from "@/model/battle/types";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

export const defaultBattle = () => {
    return Battle.create({
        battleOptions: {
            engineVersion: lastInArray(window.api.content.engine.installedVersions),
            gameVersion: lastInArray(window.api.content.game.installedVersions).version.fullString,
            isHost: true,
            mapFileName: randomFromArray(defaultMaps),
            startPosType: StartPosType.Fixed
        },
        allyTeams: [
            {
                battlers: [
                    {
                        user: window.api.session.currentUser
                    }
                ]
            },
            {
                battlers: [
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

// export const defaultBattle = () : Battle => {
//     // playerName ??= "Player";
//     // engineVersion ??= ;
//     // gameVersion ??= ;
//     // const mapFileName = ;

//     // return {
//     //     hostOptions: {
//     //         engineVersion: lastInArray(window.api.content.engine.installedVersions),
//     //         gameVersion: lastInArray(window.api.content.game.installedVersions).version.fullString,
//     //         isHost: true,
//     //         mapFileName: mapFileName,
//     //         myPlayerName: window.api.session.currentUser?.userId ?? "Player",
//     //         startPosType: StartPosType.Fixed
//     //     },
//     //     allyTeams: [
//     //         {
//     //             startBox: defaultBoxes[mapFileName]?.[0] ?? { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
//     //             teams: [{
//     //                 players: [{
//     //                     name: window.api.session.currentUser?.userId ?? "Player",
//     //                     userId: window.api.session.currentUser?.userId ?? 0
//     //                 }],
//     //                 bots: []
//     //             }]
//     //         },
//     //         {
//     //             startBox: defaultBoxes[mapFileName]?.[1] ?? { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
//     //             teams: [
//     //                 {
//     //                     players: [],
//     //                     bots: [{
//     //                         name: randomFromArray(aiNames),
//     //                         ownerName: playerName,
//     //                         ai: "BARb",
//     //                         faction: BattleTypes.Faction.Armada
//     //                     }]
//     //                 },
//     //                 {
//     //                     players: [],
//     //                     bots: [{
//     //                         name: randomFromArray(aiNames),
//     //                         ownerName: playerName,
//     //                         ai: "BARb",
//     //                         faction: BattleTypes.Faction.Armada
//     //                     }]
//     //                 },
//     //                 {
//     //                     players: [],
//     //                     bots: [{
//     //                         name: randomFromArray(aiNames),
//     //                         ownerName: playerName,
//     //                         ai: "BARb",
//     //                         faction: BattleTypes.Faction.Armada
//     //                     }]
//     //                 }
//     //             ]
//     //         }
//     //     ],
//     //     spectators: []
//     // };
// };