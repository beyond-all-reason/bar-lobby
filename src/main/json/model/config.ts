// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export const configSchema = Type.Object({
    // source of config file
    configUrl: Type.String({ default: "https://lobby-config.beyondallreason.dev/config.json" }),
    // replaces src\main\config\content-sources.ts
    rapidHost: Type.String({ default: "repos-cdn.beyondallreason.dev" }),
    rapidGame: Type.String({ default: "byar" }),
    gameGithubOwner: Type.String({ default: "beyond-all-reason" }),
    gameGithubRepo: Type.String({ default: "Beyond-All-Reason" }),
    engineGitHubOwner: Type.String({ default: "beyond-all-reason" }),
    engineGithubRepo: Type.String({ default: "spring" }),
    engineReleaseUrl: Type.String({ default: "https://files-cdn.beyondallreason.dev/find" }),
    // replaces src\main\config\default-maps.ts
    defaultMaps: Type.Array(Type.String(), { default: ["Quicksilver Remake 1.24", "Red Comet Remake 1.8"] }),
    // replaces src\main\config\default-versions.ts
    latestGameVersion: Type.String({ default: "byar:test" }),
    defaultEngineVersion: Type.String({ default: "2025.06.21" }),
    // replaces src\main\content\game\pool-cdn.ts
    cdnUrl: Type.String({ default: "https://pool-init.beyondallreason.dev" }),
    // replaces src\main\content\pr-downloader.ts
    prdRapidUseStreamer: Type.String({ default: "false" }),
    prdRapidRepoMaster: Type.String({ default: "https://repos-cdn.beyondallreason.dev/repos.gz" }),
    prdHttpSearchUrl: Type.String({ default: "https://files-cdn.beyondallreason.dev/find" }),
    // replaces src\main\json\model\settings.ts
    logUploadUrl: Type.String({ default: "https://log.beyondallreason.dev/" }),
    lobbyServer: Type.String({ default: "wss://server4.beyondallreason.info" }),
    // replaces src\main\services\maps.service.ts
    mapsMetadataUrl: Type.String({ default: "https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json" }),
    // replaces src\main\services\news.service.ts
    newsRssUrl: Type.String({ default: "https://www.beyondallreason.info/news/rss.xml" }),
    devlogRssUrl: Type.String({ default: "https://www.beyondallreason.info/microblogs/rss.xml" }),
    // replaces src\main\services\shell.service.ts
    replayServiceUrl: Type.String({ default: "https://bar-rts.com/replays" }),
    newsServiceUrl: Type.String({ default: "https://www.beyondallreason.info/news" }),
    // replaces src\renderer\components\navbar\ServerSettings.vue
    defaultServers: Type.Array(Type.String(), {
        default: ["wss://server4.beyondallreason.info", "wss://server5.beyondallreason.info", "wss://lobby-server-dev.beyondallreason.dev", "ws://localhost:4000"],
    }),
    // replaces src\renderer\views\watch\replays.vue
    replayDownloadUrl: Type.String({ default: "https://bar-rts.com/replays" }),
});
