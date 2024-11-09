import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { Unit } from "@main/content/game/unit";
import { MapData } from "@main/content/maps/map-data";
import { Replay } from "@main/content/replays/replay";
import Dexie, { EntityTable } from "dexie";

export const db = new Dexie("BarLobby") as Dexie & {
    replays: EntityTable<Replay, "fileName">;
    maps: EntityTable<MapData, "scriptName">;
    units: EntityTable<Unit, "unitId">;
    gameVersions: EntityTable<GameVersion, "gameVersion">;
    engineVersions: EntityTable<EngineVersion, "id">;
};

db.version(1).stores({
    replays:
        "fileName, gameId, filePath, engineVersion, gameVersion, mapScriptName, startTime, gameDurationMs, gameEndedNormally, chatlog, hasBots, preset, winningTeamId, teams, contenders, spectators, script, battleSettings, hostSettings, gameSettings, mapSettings",
    maps: "scriptName, fileName, friendlyName, description, mapHardness, gravity, tidalStrength, maxMetal, extractorRadius, minWind, maxWind, width, height, minDepth, maxDepth, lastLaunched",
    units: `
        &unitId,
        images.preview,
        images.preview3d,
        factionKey,
        unitName,
        unitDescription,
        unitCategory
        `,
    gameVersions: "gameVersion, packageMd5",
    engineVersions: "id, lastLaunched, ais",
});
