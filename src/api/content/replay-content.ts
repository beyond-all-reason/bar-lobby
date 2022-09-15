import fs from "fs";
import path from "path";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import replayFunctions from "@/workers/parse-replay";
import { createWorkerFunctions as createWorkerFunctions } from "@/workers/worker-helpers";

/**
 * 1. on launch, scan demos folder and read in all filenames
 * 2. read all filenames of cached demos from db
 * 3. iterate through filenames in #1 and cache any not in #2
 * 4. iterate through filenames in #2 and delete any not in #1
 *
 * - store table of errored replays, so we know to skip over these files in the future to avoid getting stuck in a failing caching loop
 * - after launch, watch the demos dir and run #3 if new files added. run #4 if files deleted
 */
export class ReplayContentAPI extends AbstractContentAPI {
    protected parseReplay: typeof replayFunctions.parseReplay;

    constructor() {
        super();

        const { parseReplay } = createWorkerFunctions(new Worker(new URL(`../../workers/parse-replay.ts`, import.meta.url), { type: "module" }), replayFunctions);
        this.parseReplay = parseReplay;
    }

    public async init() {
        await api.cacheDb.schema
            .createTable("replay")
            .ifNotExists()
            .addColumn("replayId", "integer", (col) => col.primaryKey().autoIncrement())
            .addColumn("gameId", "varchar", (col) => col.notNull())
            .addColumn("fileName", "varchar", (col) => col.notNull())
            .addColumn("engineVersion", "varchar", (col) => col.notNull())
            .addColumn("gameVersion", "varchar", (col) => col.notNull())
            .addColumn("map", "varchar", (col) => col.notNull().references("map.mapId"))
            .addColumn("startTime", "datetime", (col) => col.notNull())
            .addColumn("gameDurationMs", "integer", (col) => col.notNull())
            .addColumn("gameEndedNormally", "boolean", (col) => col.notNull())
            .addColumn("chatlog", "json", (col) => col)
            .addColumn("hasBots", "boolean", (col) => col.notNull())
            .addColumn("preset", "varchar", (col) => col.notNull())
            .addColumn("startPosType", "integer", (col) => col.notNull())
            .addColumn("winningTeamId", "integer", (col) => col.notNull())
            .addColumn("teams", "json", (col) => col.notNull())
            .addColumn("spectators", "json", (col) => col.notNull())
            .addColumn("script", "text", (col) => col.notNull())
            .addColumn("battleSettings", "json", (col) => col.notNull())
            .addColumn("gameSettings", "json", (col) => col.notNull())
            .addColumn("mapSettings", "json", (col) => col.notNull())
            .addColumn("hostSettings", "json", (col) => col.notNull().defaultTo({}))
            .execute();

        await api.cacheDb.schema
            .createTable("replayError")
            .ifNotExists()
            .addColumn("fileName", "varchar", (col) => col.primaryKey())
            .execute();
    }

    protected async cacheReplays() {
        const replaysFolder = path.join(api.info.contentPath, "demos");
        const replayFiles = await fs.promises.readdir(replaysFolder);

        const cachedReplayFiles = await api.cacheDb.selectFrom("replay").select(["fileName"]).execute();
        const cachedReplayFileNames = cachedReplayFiles.map((file) => file.fileName);

        const erroredReplayFiles = await api.cacheDb.selectFrom("replayError").select(["fileName"]).execute();
        const erroredReplayFileNames = erroredReplayFiles.map((file) => file.fileName);

        for (const replayFileName of replayFiles) {
            if (cachedReplayFileNames.includes(replayFileName) || erroredReplayFileNames.includes(replayFileName)) {
                continue;
            }

            try {
                await this.cacheReplay(replayFileName);
            } catch (err) {
                console.error(`Error parsing replay: ${replayFileName}`, err);

                api.cacheDb.insertInto("replayError").values({
                    fileName: replayFileName,
                });
            }
        }
    }

    protected async cacheReplay(replayFileName: string) {
        const replayFilePath = path.join(api.info.contentPath, "demos", replayFileName);

        const replayData = await this.parseReplay(replayFilePath);

        const numOfPlayers = replayData.info.players.length + replayData.info.ais.length;
        let preset: "duel" | "team" | "ffa" | "teamffa" = "duel";
        if (replayData.info.allyTeams.length > 2 && replayData.info.players.some((player) => player.playerId !== player.allyTeamId)) {
            preset = "teamffa";
        } else if (replayData.info.allyTeams.length > 2) {
            preset = "ffa";
        } else if (numOfPlayers > 2) {
            preset = "team";
        }

        await api.cacheDb
            .insertInto("replay")
            .values({
                gameId: replayData.header.gameId,
                fileName: path.parse(replayFilePath).base,
                engineVersion: replayData.header.versionString,
                gameVersion: replayData.info.meta.engine,
                map: replayData.info.hostSettings.mapname,
                startTime: replayData.info.meta.startTime,
                gameDurationMs: replayData.info.meta.durationMs,
                gameEndedNormally: replayData.info.meta.winningAllyTeamIds.length > 0,
                chatlog: replayData.chatlog,
                hasBots: replayData.info.ais.length > 0,
                preset: preset,
                startPosType: replayData.info.meta.startPosType,
                winningTeamId: replayData.info.meta.winningAllyTeamIds[0],
                teams: replayData.info.allyTeams,
                contenders: [...replayData.info.players, ...replayData.info.ais],
                spectators: replayData.info.spectators,
                script: replayData.script,
                battleSettings: replayData.info.hostSettings,
                gameSettings: replayData.info.gameSettings,
                mapSettings: replayData.info.mapSettings,
                hostSettings: replayData.info.spadsSettings,
            })
            .execute();

        console.log(`${replayFileName} cached`);
    }
}
