// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Changes to this config schema's defaults will require a new config version to be deployed.
// You can generate a new one from defaults with the command: npm run generate-default-config

import { Type } from "@sinclair/typebox";

export const configSchema = Type.Object({
    // Note, configUrl must match the expected location or else Github Actions will not upload a new one.
    configUrl: Type.String({ default: "https://lobby-config.beyondallreason.dev/config.json" }),
    rapidHost: Type.String({ default: "repos-cdn.beyondallreason.dev" }),
    rapidGame: Type.String({ default: "byar" }),
    engineReleaseUrl: Type.String({ default: "https://files-cdn.beyondallreason.dev/find" }),
    defaultMaps: Type.Array(Type.String(), { default: ["Quicksilver Remake 1.24", "Red Comet Remake 1.8"] }),
    latestGameVersion: Type.String({ default: "byar:test" }),
    defaultEngineVersion: Type.String({ default: "2025.06.21" }),
    initialPoolDataUrl: Type.String({ default: "https://pool-init.beyondallreason.dev" }),
    prdRapidUseStreamer: Type.String({ default: "false" }),
    prdRapidRepoMaster: Type.String({ default: "https://repos-cdn.beyondallreason.dev/repos.gz" }),
    prdHttpSearchUrl: Type.String({ default: "https://files-cdn.beyondallreason.dev/find" }),
    logUploadUrl: Type.String({ default: "https://log.beyondallreason.dev/" }),
    lobbyServer: Type.String({ default: "wss://server4.beyondallreason.info" }),
    mapsMetadataUrl: Type.String({ default: "https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json" }),
    newsRssUrl: Type.String({ default: "https://www.beyondallreason.info/news/rss.xml" }),
    devlogRssUrl: Type.String({ default: "https://www.beyondallreason.info/microblogs/rss.xml" }),
    allowedUrlLinks: Type.Array(Type.String(), { default: ["https://bar-rts.com/replays", "https://www.beyondallreason.info/news"] }),
    replayServiceUrl: Type.String({ default: "https://bar-rts.com/replays" }),
    defaultServers: Type.Array(Type.String(), {
        default: ["wss://server4.beyondallreason.info", "wss://server5.beyondallreason.info", "wss://lobby-server-dev.beyondallreason.dev", "ws://localhost:4000"],
    }),
    replayDownloadUrl: Type.String({ default: "https://bar-rts.com/replays" }),
});

export const envVarsMap = {
    configUrl: "BAR_LOBBY_CONFIG_URL",
    rapidHost: "BAR_LOBBY_RAPID_HOST",
    rapidGame: "BAR_LOBBY_RAPID_GAME",
    gameGithubOwner: "BAR_LOBBY_GAME_GITHUB_OWNER",
    gameGithubRepo: "BAR_LOBBY_GAME_GITHUB_REPO",
    engineGithubOwner: "BAR_LOBBY_ENGINE_GITHUB_OWNER",
    engineGithubRepo: "BAR_LOBBY_ENGINE_GITHUB_REPO",
    engineReleaseUrl: "BAR_LOBBY_ENGINE_RELEASE_URL",
    defaultMaps: "BAR_LOBBY_DEFAULT_MAPS",
    latestGameVersion: "BAR_LOBBY_LATEST_GAME_VERSION",
    defaultEngineVersion: "BAR_LOBBY_DEFAULT_ENGINE_VERSION",
    initialPoolDataUrl: "BAR_LOBBY_INITIAL_POOL_DATA_URL",
    prdRapidUseStreamer: "BAR_LOBBY_PRD_RAPID_USE_STREAMER",
    prdRapidRepoMaster: "BAR_LOBBY_PRD_RAPID_REPO_MASTER",
    prdHttpSearchUrl: "BAR_LOBBY_PRD_HTTP_SEARCH_URL",
    logUploadUrl: "BAR_LOBBY_LOG_UPLOAD_URL",
    lobbyServer: "BAR_LOBBY_LOBBY_SERVER",
    mapsMetadataUrl: "BAR_LOBBY_MAPS_METADATA_URL",
    newsRssUrl: "BAR_LOBBY_NEWS_RSS_URL",
    devlogRssUrl: "BAR_LOBBY_DEVLOG_RSS_URL",
    replayServiceUrl: "BAR_LOBBY_REPLAY_SERVICE_URL",
    newsServiceUrl: "BAR_LOBBY_NEWS_SERVICE_URL",
    mapDownloadUrl: "BAR_LOBBY_MAP_DOWNLOAD_URL",
    replayDownloadUrl: "BAR_LOBBY_REPLAY_DOWNLOAD_URL",
};
