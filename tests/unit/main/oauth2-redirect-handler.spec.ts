// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));

import RedirectHandler from "@main/oauth2/redirect-handler";

const STATE = "expected-state";

describe("OAuth2 redirect handler", () => {
    let handler: RedirectHandler;
    let redirectUri: string;

    const callback = (query: string) => fetch(`${redirectUri}?${query}`);

    beforeEach(async () => {
        handler = new RedirectHandler(STATE);
        redirectUri = await handler.start();
    });

    afterEach(() => handler.close());

    it("accepts a callback carrying the expected state", async () => {
        const response = await callback(`code=auth-code&state=${STATE}`);

        expect(response.status).toBe(200);
        expect((await handler.waitForCallback()).searchParams.get("code")).toBe("auth-code");
    });

    // A forged request must neither inject its code nor end the wait, so the real redirect still gets through.
    it.each([
        ["missing", "code=forged"],
        ["wrong", "code=forged&state=other-state"],
    ])("rejects a callback with a %s state and keeps waiting", async (_name, query) => {
        expect((await callback(query)).status).toBe(400);

        const waiting = handler.waitForCallback();
        expect((await callback(`code=auth-code&state=${STATE}`)).status).toBe(200);

        expect((await waiting).searchParams.get("code")).toBe("auth-code");
    });

    it("keeps the first valid callback when a second one arrives", async () => {
        await callback(`code=first&state=${STATE}`);

        expect((await callback(`code=second&state=${STATE}`)).status).toBe(400);
        expect((await handler.waitForCallback()).searchParams.get("code")).toBe("first");
    });

    it("passes an error callback through when it carries the expected state", async () => {
        expect((await callback(`error=access_denied&state=${STATE}`)).status).toBe(200);
        expect((await handler.waitForCallback()).searchParams.get("error")).toBe("access_denied");
    });
});
