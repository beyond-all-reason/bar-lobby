// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";

const SERVER = "https://lobby.example.com";
const WELL_KNOWN = `${SERVER}/.well-known/oauth-authorization-server`;
const TOKEN_ENDPOINT = `${SERVER}/oauth/token`;
const REDIRECT_URI = "http://127.0.0.1:12345/oauth2callback";

const redirect = vi.hoisted(() => ({
    start: vi.fn(),
    waitForCallback: vi.fn(),
    close: vi.fn(),
}));

vi.mock("electron", () => ({ shell: { openExternal: vi.fn() } }));

vi.mock("@main/config/server", () => ({
    OAUTH_CLIENT_ID: "generic_lobby",
    OAUTH_SCOPE: "tachyon.lobby",
    getOAuthAuthorizationServerURL: () => SERVER,
    getOAuthWellKnownURL: () => WELL_KNOWN,
}));

vi.mock("@main/oauth2/redirect-handler", () => ({
    default: class {
        start = redirect.start;
        waitForCallback = redirect.waitForCallback;
        close = redirect.close;
    },
}));

import { authenticate, renewAccessToken, TokenRequestError } from "@main/oauth2/oauth2";

const metadata = {
    issuer: SERVER,
    authorization_endpoint: `${SERVER}/oauth/authorize`,
    token_endpoint: TOKEN_ENDPOINT,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const text = (body: string, status = 200) => new Response(body, { status });

const tokens = { access_token: "access-1", refresh_token: "refresh-1", expires_in: 1800 };

let fetchMock: any;

function respondWith(...responses: (Response | Error)[]) {
    for (const response of responses) {
        if (response instanceof Error) {
            fetchMock.mockRejectedValueOnce(response);
        } else {
            fetchMock.mockResolvedValueOnce(response);
        }
    }
}

function tokenRequestBody(): URLSearchParams {
    const call = fetchMock.mock.calls.find(([url]: [string]) => url === TOKEN_ENDPOINT);
    expect(call).toBeDefined();

    return call[1].body as URLSearchParams;
}

async function kindOfThrown(run: () => Promise<unknown>): Promise<string> {
    try {
        await run();
    } catch (error) {
        expect(error).toBeInstanceOf(TokenRequestError);

        return (error as TokenRequestError).kind;
    }

    throw new Error("expected the call to throw");
}

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    redirect.start.mockResolvedValue(REDIRECT_URI);
    redirect.waitForCallback.mockResolvedValue(new URL(`${REDIRECT_URI}?code=auth-code`));
    redirect.close.mockClear();
});

describe("authorization server metadata", () => {
    it("rejects an issuer that is not the configured server", async () => {
        respondWith(json({ ...metadata, issuer: "https://elsewhere.example.com" }));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("rejects endpoints that live off the authorization server", async () => {
        respondWith(json({ ...metadata, token_endpoint: "https://lobby.example.com.evil.test/oauth/token" }));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("treats a server error as transient", async () => {
        respondWith(text("upstream down", 502));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("server");
    });

    it("rejects a body that is not JSON", async () => {
        respondWith(text("<html>nope</html>"));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("reports an unreachable server as a network failure", async () => {
        respondWith(new TypeError("fetch failed"));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("network");
    });
});

describe("token requests", () => {
    it("sends the refresh grant as a form encoded body, not a query string", async () => {
        respondWith(json(metadata), json(tokens));

        await renewAccessToken("refresh-0");

        const [url, init] = fetchMock.mock.calls[1];
        expect(url).toBe(TOKEN_ENDPOINT);
        expect(url).not.toContain("?");
        expect(init.method).toBe("POST");
        expect(init.headers["content-type"]).toBe("application/x-www-form-urlencoded");

        const body = tokenRequestBody();
        expect(body.get("grant_type")).toBe("refresh_token");
        expect(body.get("refresh_token")).toBe("refresh-0");
        expect(body.get("client_id")).toBe("generic_lobby");
        expect(body.get("scope")).toBe("tachyon.lobby");
    });

    it("sends the code exchange as a form encoded body carrying the verifier", async () => {
        respondWith(json(metadata), json(tokens));

        await authenticate();

        const [url, init] = fetchMock.mock.calls[1];
        expect(url).toBe(TOKEN_ENDPOINT);
        expect(url).not.toContain("?");

        const body = tokenRequestBody();
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("code")).toBe("auth-code");
        expect(body.get("redirect_uri")).toBe(REDIRECT_URI);
        expect(body.get("code_verifier")).toBeTruthy();
        expect(init.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    });
});

describe("token error classification", () => {
    it("marks a rejected grant so the session can be dropped", async () => {
        respondWith(json(metadata), json({ error: "invalid_grant", error_description: "token revoked" }, 400));

        const kind = await kindOfThrown(() => renewAccessToken("refresh-0"));
        expect(kind).toBe("invalid_grant");
    });

    it("includes the server description in the message", async () => {
        respondWith(json(metadata), json({ error: "invalid_grant", error_description: "token revoked" }, 400));

        await expect(renewAccessToken("refresh-0")).rejects.toThrow(/token revoked/);
    });

    it("marks a 500 from the token endpoint as transient", async () => {
        respondWith(json(metadata), json({ error: "server_error" }, 500));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("server");
    });

    it("marks other rejections as protocol failures", async () => {
        respondWith(json(metadata), json({ error: "invalid_request" }, 400));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("copes with an error body that is not JSON", async () => {
        respondWith(json(metadata), new Response("gateway timeout", { status: 504, statusText: "Gateway Timeout" }));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("server");
    });
});

describe("token response validation", () => {
    it("keeps the current refresh token when the server does not rotate it", async () => {
        respondWith(json(metadata), json({ access_token: "access-1", expires_in: 1800 }));

        await expect(renewAccessToken("refresh-0")).resolves.toEqual({
            token: "access-1",
            refreshToken: "refresh-0",
            expiresIn: 1800,
        });
    });

    it("rejects a response with no access token", async () => {
        respondWith(json(metadata), json({ refresh_token: "refresh-1", expires_in: 1800 }));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("rejects a lifetime it cannot schedule against", async () => {
        respondWith(json(metadata), json({ access_token: "access-1", expires_in: null }));

        expect(await kindOfThrown(() => renewAccessToken("refresh-0"))).toBe("protocol");
    });

    it("requires a refresh token on a first sign in", async () => {
        respondWith(json(metadata), json({ access_token: "access-1", expires_in: 1800 }));

        expect(await kindOfThrown(() => authenticate())).toBe("protocol");
    });
});

describe("interactive sign in", () => {
    it("reports a denied consent screen", async () => {
        respondWith(json(metadata));
        redirect.waitForCallback.mockResolvedValue(new URL(`${REDIRECT_URI}?error=access_denied`));

        await expect(authenticate()).rejects.toThrow(/access_denied/);
    });

    it("closes the loopback server even when the exchange fails", async () => {
        respondWith(json(metadata), json({ error: "invalid_request" }, 400));

        await expect(authenticate()).rejects.toThrow();
        expect(redirect.close).toHaveBeenCalled();
    });
});
