// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Changes to this config schema's defaults will require a new config version to be deployed.
// You can generate a new one from defaults with the command: npm run generate-default-config

import { Type, Static } from "@sinclair/typebox";

export const configSchema = Type.Object({
    // Note, configUrl is required and must match the expected location or else Github Actions will not upload a new one.
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

export const updateConfigSchema = Type.Partial(configSchema);
export type TUpdateConfigSchema = Static<typeof updateConfigSchema>;
