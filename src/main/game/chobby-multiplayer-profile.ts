// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

import { BUNDLED_ASSETS_PATH, CONFIG_PATH } from "@main/config/app";
import { CHOBBY_MULTIPLAYER_ENGINE_FALLBACK_VERSION } from "@main/config/default-versions";
import { gameContentAPI } from "@main/content/game/game-content";
import { logger } from "@main/utils/logger";

const log = logger("chobby-multiplayer-profile.ts");

export const CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS = "byar:test";
export const CHOBBY_MULTIPLAYER_PROFILE_CACHE_FILE_NAME = "chobby-multiplayer-profile.json";
export const CHOBBY_MULTIPLAYER_PROFILE_URL_ENV = "BAR_CHOBBY_MULTIPLAYER_PROFILE_URL";

type ChobbyMultiplayerProfileSource = "launch-override" | "remote-manifest" | "bundled-manifest" | "cached-manifest" | "fallback";

export interface ChobbyMultiplayerProfile {
    engineVersion: string;
    gameRapidAlias: string;
    gameVersion?: string;
    gamePackageMd5?: string;
    observedAt?: string;
    source: ChobbyMultiplayerProfileSource;
}

interface ChobbyMultiplayerProfileCandidate {
    engineVersion?: unknown;
    gameRapidAlias?: unknown;
    gameVersion?: unknown;
    gamePackageMd5?: unknown;
    observedAt?: unknown;
}

function getProfileCachePath() {
    return path.join(CONFIG_PATH, CHOBBY_MULTIPLAYER_PROFILE_CACHE_FILE_NAME);
}

function getBundledProfilePath() {
    return BUNDLED_ASSETS_PATH ? path.join(BUNDLED_ASSETS_PATH, CHOBBY_MULTIPLAYER_PROFILE_CACHE_FILE_NAME) : undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeProfileCandidate(candidate: ChobbyMultiplayerProfileCandidate, source: ChobbyMultiplayerProfileSource): ChobbyMultiplayerProfile | undefined {
    const engineVersion = toStringOrUndefined(candidate.engineVersion);
    if (!engineVersion) {
        return undefined;
    }

    return {
        engineVersion,
        gameRapidAlias: toStringOrUndefined(candidate.gameRapidAlias) ?? CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS,
        gameVersion: toStringOrUndefined(candidate.gameVersion),
        gamePackageMd5: toStringOrUndefined(candidate.gamePackageMd5),
        observedAt: toStringOrUndefined(candidate.observedAt),
        source,
    };
}

async function readCachedProfile(): Promise<ChobbyMultiplayerProfile | undefined> {
    try {
        const profile = JSON.parse(await fs.promises.readFile(getProfileCachePath(), "utf-8")) as ChobbyMultiplayerProfileCandidate;
        return normalizeProfileCandidate(profile, "cached-manifest");
    } catch {
        return undefined;
    }
}

async function readBundledProfile(): Promise<ChobbyMultiplayerProfile | undefined> {
    const bundledProfilePath = getBundledProfilePath();
    if (!bundledProfilePath) {
        return undefined;
    }

    try {
        const profile = JSON.parse(await fs.promises.readFile(bundledProfilePath, "utf-8")) as ChobbyMultiplayerProfileCandidate;
        return normalizeProfileCandidate(profile, "bundled-manifest");
    } catch {
        return undefined;
    }
}

async function writeCachedProfile(profile: ChobbyMultiplayerProfile) {
    await fs.promises.mkdir(CONFIG_PATH, { recursive: true });
    await fs.promises.writeFile(getProfileCachePath(), `${JSON.stringify(profile, null, 2)}\n`, "utf-8");
}

async function fetchRemoteProfile(profileUrl: string): Promise<ChobbyMultiplayerProfile | undefined> {
    try {
        const response = await axios({
            url: profileUrl,
            method: "get",
            responseType: "json",
            timeout: 5000,
        });
        const profile = normalizeProfileCandidate(response.data as ChobbyMultiplayerProfileCandidate, "remote-manifest");
        if (profile) {
            await writeCachedProfile(profile);
        }
        return profile;
    } catch (err) {
        log.warn(`Could not fetch Chobby multiplayer profile manifest from ${profileUrl}: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
    }
}

async function resolveLatestGameVersion(profile: ChobbyMultiplayerProfile): Promise<ChobbyMultiplayerProfile> {
    const latestGame = await gameContentAPI.getLatestTestVersion();
    if (!latestGame) {
        return profile;
    }

    return {
        ...profile,
        gameVersion: latestGame.gameVersion,
        gamePackageMd5: latestGame.packageMd5,
    };
}

export async function resolveChobbyMultiplayerProfile(engineVersionOverride?: string): Promise<ChobbyMultiplayerProfile> {
    if (engineVersionOverride) {
        return resolveLatestGameVersion({
            engineVersion: engineVersionOverride,
            gameRapidAlias: CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS,
            source: "launch-override",
        });
    }

    const remoteProfileUrl = toStringOrUndefined(process.env[CHOBBY_MULTIPLAYER_PROFILE_URL_ENV]);
    const remoteProfile = remoteProfileUrl ? await fetchRemoteProfile(remoteProfileUrl) : undefined;
    const bundledProfile = remoteProfile ?? (await readBundledProfile());
    const cachedProfile = bundledProfile ?? (await readCachedProfile());
    const profile =
        cachedProfile ??
        ({
            engineVersion: CHOBBY_MULTIPLAYER_ENGINE_FALLBACK_VERSION,
            gameRapidAlias: CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS,
            observedAt: "2026-06-23T00:00:00.000Z",
            source: "fallback",
        } satisfies ChobbyMultiplayerProfile);

    return resolveLatestGameVersion(profile);
}
