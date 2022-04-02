import { aiNames } from "@/config/ai-names";
import { defaultBoxes } from "@/config/default-boxes";
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
                startBox: defaultBoxes[mapFileName]?.[0] ?? { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
                teams: [{
                    players: [{
                        name: playerName,
                        userId: window.api.session.model.user?.id || 0
                    }],
                    bots: []
                }]
            },
            {
                startBox: defaultBoxes[mapFileName]?.[1] ?? { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
                teams: [
                    {
                        players: [],
                        bots: [{
                            name: randomFromArray(aiNames),
                            ownerName: playerName,
                            ai: "BARb",
                            faction: BattleTypes.Faction.Armada
                        }]
                    },
                    {
                        players: [],
                        bots: [{
                            name: randomFromArray(aiNames),
                            ownerName: playerName,
                            ai: "BARb",
                            faction: BattleTypes.Faction.Armada
                        }]
                    },
                    {
                        players: [],
                        bots: [{
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