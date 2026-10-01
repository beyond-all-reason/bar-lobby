// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A time-limited test server announced by the remote config. Users opt in, and a remembered
// choice only lasts as long as the test it was made for. Main applies these at startup and
// the renderer when the user picks, so they work on any object with the settings' shape.

export interface AlphaTest {
    id: string;
    serverUrl: string;
    messageKey: string;
    endsAt?: string;
}

export type AlphaTestChoice = "ask" | "join" | "decline";

export interface AlphaTestSettings {
    lobbyServer: string;
    customServerList: string[];
    alphaTestId: string;
    alphaTestServerUrl: string;
    alphaTestChoice: AlphaTestChoice;
    alphaTestPreviousServer: string;
}

export function joinAlphaTest(settings: AlphaTestSettings, serverUrl: string, defaultServers: readonly string[]) {
    // Already on it, whether from an earlier join or by their own pick, so there is nothing to go back to
    // that isn't already recorded.
    if (settings.lobbyServer !== serverUrl) {
        settings.alphaTestPreviousServer = settings.lobbyServer;
    }
    // Test servers are often one of the defaults already, and the list must not show it twice.
    if (!defaultServers.includes(serverUrl) && !settings.customServerList.includes(serverUrl)) {
        settings.customServerList.push(serverUrl);
    }
    settings.lobbyServer = serverUrl;
}

// Leaves the test server entry in the custom list, but puts the user back where they were. Someone who
// moved off the test server themselves since joining is left where they went.
export function leaveAlphaTest(settings: AlphaTestSettings, serverUrl: string) {
    if (serverUrl && settings.lobbyServer === serverUrl && settings.alphaTestPreviousServer) {
        settings.lobbyServer = settings.alphaTestPreviousServer;
    }
    settings.alphaTestPreviousServer = "";
}

export function needsAlphaTestPrompt(settings: Pick<AlphaTestSettings, "alphaTestChoice">, test: AlphaTest | undefined) {
    return !!test && settings.alphaTestChoice === "ask";
}

// Brings the stored choice in line with whatever test the config currently announces, if any.
export function syncAlphaTest(settings: AlphaTestSettings, test: AlphaTest | undefined, defaultServers: readonly string[]) {
    const testId = test?.id ?? "";

    if (settings.alphaTestId !== testId) {
        // Ended, or replaced by a different test: the old choice was for that one only.
        leaveAlphaTest(settings, settings.alphaTestServerUrl);
        settings.alphaTestId = testId;
        settings.alphaTestServerUrl = test?.serverUrl ?? "";
        settings.alphaTestChoice = "ask";
    } else if (test && settings.alphaTestServerUrl !== test.serverUrl) {
        // Same test on a different server. Leaving the old one first keeps the server from before the
        // test as the one to go back to, rather than the old test server.
        leaveAlphaTest(settings, settings.alphaTestServerUrl);
        settings.alphaTestServerUrl = test.serverUrl;
    }

    if (!test) return;

    if (settings.alphaTestChoice === "join") {
        joinAlphaTest(settings, test.serverUrl, defaultServers);
    } else if (settings.alphaTestChoice === "decline") {
        leaveAlphaTest(settings, test.serverUrl);
    }
}
