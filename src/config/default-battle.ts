import { defaultMaps } from "@/config/default-maps";
import { AllyTeam } from "@/model/battle/ally-team";
import { Battle } from "@/model/battle/battle";
import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { StartPosType } from "@/model/battle/types";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

const defaultBattle = () => {
    const battle = new Battle({
        battleOptions: {
            engineVersion: lastInArray(window.api.content.engine.installedVersions),
            gameVersion: lastInArray(window.api.content.game.installedVersions).version.fullString,
            isHost: true,
            mapFileName: randomFromArray(defaultMaps),
            startPosType: StartPosType.Fixed
        }
    });

    const allyTeam1 = new AllyTeam();
    const player = new Player({
        allyTeam: allyTeam1,
        name: window.api.session.currentUser?.username ?? "Player"
    });

    const allyTeam2 = new AllyTeam();
    for (let i=0; i<3; i++) {
        const bot = new Bot({
            allyTeam: allyTeam2,
            aiShortName: "BARb"
        });
        allyTeam2.addBattler;
    }
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