import { aiNames } from "@/config/ai-names";
import { defaultMaps } from "@/config/default-maps";
import { BattleTypes } from "@/model/battle";
import { EngineVersionFormat, GameVersionFormat } from "@/model/formats";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

export const defaultBattle = (playerName?: string, engineVersion?: EngineVersionFormat, gameVersion?: GameVersionFormat) : BattleTypes.Battle => {
    playerName ??= "Player";
    engineVersion ??= lastInArray(window.api.content.engine.installedVersions);
    gameVersion ??= lastInArray(window.api.content.game.installedVersions).version.fullString;
    const mapFileName = randomFromArray(defaultMaps);

    return {
        hostOptions: {
            engineVersion: engineVersion,
            gameVersion: gameVersion,
            isHost: true,
            mapFileName: mapFileName,
            myPlayerName: playerName,
            startPosType: BattleTypes.StartPosType.Fixed
        },
        allyTeams: [
            {
                teams: [{
                    players: [{
                        name: playerName
                    }],
                    ais: []
                }]
            },
            {
                teams: [
                    {
                        players: [],
                        ais: [{
                            name: randomFromArray(aiNames),
                            ownerName: playerName,
                            ai: "BARb",
                            faction: BattleTypes.Faction.Armada
                        }]
                    },
                    {
                        players: [],
                        ais: [{
                            name: randomFromArray(aiNames),
                            ownerName: playerName,
                            ai: "BARb",
                            faction: BattleTypes.Faction.Armada
                        }]
                    },
                    {
                        players: [],
                        ais: [{
                            name: randomFromArray(aiNames),
                            ownerName: playerName,
                            ai: "BARb",
                            faction: BattleTypes.Faction.Armada
                        }]
                    }
                ]
            }
        ],
        spectators: []
    };
};