// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";

import { ChobbyLauncherLoopback, ChobbyLauncherLoopbackOptions } from "@main/game/chobby-launcher-loopback";
import { logger } from "@main/utils/logger";

export const CHOBBY_LOOPBACK_HELPER_ARG = "--bar-chobby-loopback-helper";
export const CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV = "BAR_CHOBBY_LOOPBACK_HELPER_OPTIONS";

const log = logger("main/game/chobby-loopback-helper.ts");

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === "object" && value !== null && Object.values(value).every((entry) => typeof entry === "string");
}

function parseHelperOptions(): ChobbyLauncherLoopbackOptions {
    const rawOptions = process.env[CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV];
    if (!rawOptions) {
        throw new Error(`${CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV} is not set`);
    }

    const parsed = JSON.parse(rawOptions) as unknown;
    if (!isStringRecord(parsed)) {
        throw new Error(`${CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV} must be a JSON object with string values`);
    }

    return {
        engineVersion: parsed.engineVersion,
        assetsPath: parsed.assetsPath,
        bundledAssetsPath: parsed.bundledAssetsPath || undefined,
        writeDataPath: parsed.writeDataPath,
        platform: parsed.platform as NodeJS.Platform,
    };
}

export function isChobbyLoopbackHelperProcess(argv = process.argv) {
    return argv.includes(CHOBBY_LOOPBACK_HELPER_ARG);
}

function configureHeadlessHelperApp() {
    app.disableHardwareAcceleration();

    if (process.platform === "darwin") {
        app.setActivationPolicy("prohibited");
        app.dock?.hide();
    }
}

export async function runChobbyLoopbackHelper() {
    configureHeadlessHelperApp();

    let isShuttingDown = false;
    let loopback: ChobbyLauncherLoopback | null = null;

    const shutdown = () => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        (loopback?.close() ?? Promise.resolve())
            .catch((err: unknown) => log.warn(`Failed to close Chobby loopback helper cleanly: ${err instanceof Error ? err.message : String(err)}`))
            .finally(() => app.exit(0));
    };

    loopback = new ChobbyLauncherLoopback({
        ...parseHelperOptions(),
        idleShutdownDelayMs: 5_000,
        onIdle: shutdown,
    });

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    await app.whenReady();
    const connection = await loopback.start();
    log.info(`Chobby loopback helper ready at ${connection.host}:${connection.port}, connectionFile: ${connection.connectionFilePath}`);
}
