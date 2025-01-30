import { EngineVersion } from "@main/content/engine/engine-version";
import { GameVersion } from "@main/content/game/game-version";
import { MapData } from "@main/content/maps/map-data";
import { Replay } from "@main/content/replays/replay";
import Dexie, { EntityTable } from "dexie";

export async function initDb() {
    await db.open();
    await db.maps.toArray();
}

export const db = new Dexie("BarLobby") as Dexie & {
    replays: EntityTable<Replay, "fileName">;
    maps: EntityTable<MapData, "springName">;
    gameVersions: EntityTable<GameVersion, "gameVersion">;
    engineVersions: EntityTable<EngineVersion, "id">;
};

db.version(1).stores({
    replays:
        "fileName, gameId, filePath, engineVersion, gameVersion, springName, startTime, gameDurationMs, gameEndedNormally, hasBots, winningTeamId, teams, contenders, spectators, battleSettings, hostSettings, gameSettings, mapSettings",
    maps: `
        springName,
        author,
        certified,
        description,
        displayName,
        filename,
        images.preview,
        mapHeight,
        mapLists,
        mapWidth,
        playerCountMax,
        playerCountMin,
        tags,
        terrain,
        tidalStrength,
        windMax,
        windMin,
        isInstalled,
        isDownloading,
        isFavorite
      `,
    gameVersions: "gameVersion, packageMd5",
    engineVersions: "id, lastLaunched, ais",
});

db.on("ready", function () {
    console.debug("Database is ready");
});
db.on("populate", function () {
    console.debug("Database is populated");
});
db.on("blocked", function () {
    console.debug("Database is blocked");
});
db.on("versionchange", function () {
    console.debug("Database is versionchange");
});
db.on("close", function () {
    console.debug("Database is close");
});
