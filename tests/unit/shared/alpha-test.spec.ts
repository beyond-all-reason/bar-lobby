// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect } from "vitest";
import { joinAlphaTest, leaveAlphaTest, needsAlphaTestPrompt, syncAlphaTest, type AlphaTest, type AlphaTestSettings } from "@shared/alpha-test";

const SERVER4 = "wss://server4.beyondallreason.info";
const SERVER5 = "wss://server5.beyondallreason.info";
const TEST_SERVER = "wss://integration.example";
const DEFAULTS = [SERVER4, SERVER5];

function settingsWith(overrides: Partial<AlphaTestSettings> = {}): AlphaTestSettings {
    return {
        lobbyServer: SERVER4,
        customServerList: [],
        alphaTestId: "",
        alphaTestServerUrl: "",
        alphaTestChoice: "ask",
        alphaTestPreviousServer: "",
        ...overrides,
    };
}

function testWith(overrides: Partial<AlphaTest> = {}): AlphaTest {
    return { id: "mm-1", serverUrl: TEST_SERVER, messageKey: "rankedMatchmakingTest", ...overrides };
}

describe("joinAlphaTest", () => {
    it("selects the test server, lists it, and remembers where the user was", () => {
        const settings = settingsWith();

        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);

        expect(settings.lobbyServer).toBe(TEST_SERVER);
        expect(settings.customServerList).toEqual([TEST_SERVER]);
        expect(settings.alphaTestPreviousServer).toBe(SERVER4);
    });

    it("does not list a test server that is already a default", () => {
        const settings = settingsWith();

        joinAlphaTest(settings, SERVER5, DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER5);
        expect(settings.customServerList).toEqual([]);
    });

    it("does not list a test server twice", () => {
        const settings = settingsWith({ customServerList: [TEST_SERVER] });

        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);

        expect(settings.customServerList).toEqual([TEST_SERVER]);
    });

    it("keeps the original server when joining again", () => {
        const settings = settingsWith();

        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);
        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);

        expect(settings.alphaTestPreviousServer).toBe(SERVER4);
    });

    it("records nothing to go back to for a user already on the test server", () => {
        const settings = settingsWith({ lobbyServer: SERVER5 });

        joinAlphaTest(settings, SERVER5, DEFAULTS);

        expect(settings.alphaTestPreviousServer).toBe("");
    });
});

describe("leaveAlphaTest", () => {
    it("puts the user back on the server they had", () => {
        const settings = settingsWith();
        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);

        leaveAlphaTest(settings, TEST_SERVER);

        expect(settings.lobbyServer).toBe(SERVER4);
        expect(settings.alphaTestPreviousServer).toBe("");
        expect(settings.customServerList).toEqual([TEST_SERVER]);
    });

    it("leaves a user who moved off the test server themselves where they went", () => {
        const settings = settingsWith();
        joinAlphaTest(settings, TEST_SERVER, DEFAULTS);
        settings.lobbyServer = SERVER5;

        leaveAlphaTest(settings, TEST_SERVER);

        expect(settings.lobbyServer).toBe(SERVER5);
    });

    it("leaves a user who picked the test server before the test alone", () => {
        const settings = settingsWith({ lobbyServer: SERVER5 });
        joinAlphaTest(settings, SERVER5, DEFAULTS);

        leaveAlphaTest(settings, SERVER5);

        expect(settings.lobbyServer).toBe(SERVER5);
    });

    it("changes nothing for a user who never joined", () => {
        const settings = settingsWith();

        leaveAlphaTest(settings, TEST_SERVER);

        expect(settings.lobbyServer).toBe(SERVER4);
    });
});

describe("needsAlphaTestPrompt", () => {
    it("asks only while a test is running and no choice is remembered", () => {
        expect(needsAlphaTestPrompt(settingsWith(), testWith())).toBe(true);
        expect(needsAlphaTestPrompt(settingsWith(), undefined)).toBe(false);
        expect(needsAlphaTestPrompt(settingsWith({ alphaTestChoice: "join" }), testWith())).toBe(false);
        expect(needsAlphaTestPrompt(settingsWith({ alphaTestChoice: "decline" }), testWith())).toBe(false);
    });
});

describe("syncAlphaTest", () => {
    it("records a newly announced test without changing servers", () => {
        const settings = settingsWith();

        syncAlphaTest(settings, testWith(), DEFAULTS);

        expect(settings.alphaTestId).toBe("mm-1");
        expect(settings.alphaTestServerUrl).toBe(TEST_SERVER);
        expect(settings.alphaTestChoice).toBe("ask");
        expect(settings.lobbyServer).toBe(SERVER4);
    });

    it("applies a remembered join", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });

        syncAlphaTest(settings, testWith(), DEFAULTS);

        expect(settings.lobbyServer).toBe(TEST_SERVER);
        expect(settings.alphaTestPreviousServer).toBe(SERVER4);
    });

    it("keeps a remembered decline off the test server", () => {
        const settings = settingsWith({
            lobbyServer: TEST_SERVER,
            alphaTestId: "mm-1",
            alphaTestServerUrl: TEST_SERVER,
            alphaTestChoice: "decline",
            alphaTestPreviousServer: SERVER4,
        });

        syncAlphaTest(settings, testWith(), DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER4);
        expect(settings.alphaTestChoice).toBe("decline");
    });

    it("forgets the choice and restores the server once the test ends", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith(), DEFAULTS);

        syncAlphaTest(settings, undefined, DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER4);
        expect(settings.alphaTestChoice).toBe("ask");
        expect(settings.alphaTestId).toBe("");
        expect(settings.alphaTestServerUrl).toBe("");
    });

    it("keeps a user who was on a default test server there after it ends", () => {
        const settings = settingsWith({ lobbyServer: SERVER5, alphaTestId: "mm-1", alphaTestServerUrl: SERVER5, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith({ serverUrl: SERVER5 }), DEFAULTS);

        syncAlphaTest(settings, undefined, DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER5);
    });

    it("asks again for a different test, even on the same server", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith(), DEFAULTS);

        syncAlphaTest(settings, testWith({ id: "mm-2" }), DEFAULTS);

        expect(settings.alphaTestChoice).toBe("ask");
        expect(settings.alphaTestId).toBe("mm-2");
        expect(settings.lobbyServer).toBe(SERVER4);
    });

    it("keeps the choice when the same test is extended or reworded", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith(), DEFAULTS);

        syncAlphaTest(settings, testWith({ endsAt: "2026-12-01T00:00:00Z", messageKey: "unrankedMatchmakingTest" }), DEFAULTS);

        expect(settings.alphaTestChoice).toBe("join");
        expect(settings.lobbyServer).toBe(TEST_SERVER);
    });

    it("follows the same test to a new server, still returning to the original one later", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith(), DEFAULTS);

        syncAlphaTest(settings, testWith({ serverUrl: SERVER5 }), DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER5);
        expect(settings.alphaTestServerUrl).toBe(SERVER5);
        expect(settings.alphaTestPreviousServer).toBe(SERVER4);

        syncAlphaTest(settings, undefined, DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER4);
    });

    it("does not revert a manual switch made while joined", () => {
        const settings = settingsWith({ alphaTestId: "mm-1", alphaTestServerUrl: TEST_SERVER, alphaTestChoice: "join" });
        syncAlphaTest(settings, testWith(), DEFAULTS);
        settings.lobbyServer = SERVER5;
        settings.alphaTestChoice = "ask";

        syncAlphaTest(settings, undefined, DEFAULTS);

        expect(settings.lobbyServer).toBe(SERVER5);
    });
});
