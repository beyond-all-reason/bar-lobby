// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { OAUTH_CLIENT_ID, OAUTH_SCOPE, getOAuthAuthorizationServerURL, getOAuthWellKnownURL } from "@main/config/server";
import { generatePKCE } from "@main/oauth2/pkce";
import RedirectHandler from "@main/oauth2/redirect-handler";
import { logger } from "@main/utils/logger";
import { shell } from "electron";

const log = logger("oauth2");

export interface TokenResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
}

// Carries enough detail for the session owner to decide between retrying and
// dropping the stored credentials. Everything here is safe to log.
export type TokenErrorKind = "network" | "server" | "invalid_grant" | "protocol";

export class TokenRequestError extends Error {
    readonly kind: TokenErrorKind;

    constructor(kind: TokenErrorKind, message: string) {
        super(message);
        this.name = "TokenRequestError";
        this.kind = kind;
    }
}

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isOnAuthorizationServer(url: string): boolean {
    try {
        return new URL(url).origin === getOAuthAuthorizationServerURL();
    } catch {
        return false;
    }
}

async function request(url: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (error) {
        throw new TokenRequestError("network", `Could not reach ${url}: ${describeError(error)}`);
    }
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        throw new TokenRequestError("protocol", "Response body is not valid JSON");
    }
}

//TODO cache this response according to HTTP cache headers returned from server
export async function fetchAuthorizationServerMetadata(): Promise<{
    authorizationEndpoint: string;
    tokenEndpoint: string;
}> {
    const response = await request(getOAuthWellKnownURL());
    if (!response.ok) {
        throw new TokenRequestError(response.status >= 500 ? "server" : "protocol", `Failed to fetch OAuth2 authorization server metadata: ${response.status} ${response.statusText}`);
    }

    const body = (await readJson(response)) as Record<string, unknown>;
    const { authorization_endpoint, token_endpoint, issuer } = body;

    if (typeof authorization_endpoint !== "string" || typeof token_endpoint !== "string" || typeof issuer !== "string") {
        throw new TokenRequestError("protocol", `Invalid OAuth2 authorization server metadata: ${JSON.stringify(body)}`);
    }

    if (issuer !== getOAuthAuthorizationServerURL()) {
        throw new TokenRequestError("protocol", `Invalid OAuth2 issuer: ${issuer} does not match expected ${getOAuthAuthorizationServerURL()}`);
    }

    // The metadata document decides where we send the user and where we post
    // secrets, so neither endpoint may point off the authorization server.
    if (!isOnAuthorizationServer(authorization_endpoint) || !isOnAuthorizationServer(token_endpoint)) {
        throw new TokenRequestError("protocol", "OAuth2 endpoints do not belong to the authorization server");
    }

    return {
        authorizationEndpoint: authorization_endpoint,
        tokenEndpoint: token_endpoint,
    };
}

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;
    if (!isOnAuthorizationServer(url)) return;
    shell.openExternal(url);
}

async function requestToken(tokenEndpoint: string, params: Record<string, string>): Promise<unknown> {
    // RFC 6749 4.1.3: these go in a form-encoded body. In the query string they
    // end up in the server's access logs and in ours.
    const response = await request(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
    });

    if (!response.ok) throw await tokenError(response);

    return readJson(response);
}

async function tokenError(response: Response): Promise<TokenRequestError> {
    const body = await response.text().catch(() => "");
    let code: unknown;
    let description: unknown;

    try {
        const parsed = JSON.parse(body);
        code = parsed?.error;
        description = parsed?.error_description;
    } catch {
        // Not every failure comes back as the JSON the spec asks for.
    }

    const detail = [code, description].filter(Boolean).join(": ") || response.statusText;

    if (response.status >= 500) {
        return new TokenRequestError("server", `Token endpoint failed (${response.status}): ${detail}`);
    }
    if (code === "invalid_grant") {
        return new TokenRequestError("invalid_grant", `Token rejected: ${detail}`);
    }

    return new TokenRequestError("protocol", `Token request rejected (${response.status}): ${detail}`);
}

function parseTokenResponse(body: unknown, currentRefreshToken?: string): TokenResponse {
    const { access_token, refresh_token, expires_in } = (body ?? {}) as Record<string, unknown>;

    if (typeof access_token !== "string" || !access_token) {
        throw new TokenRequestError("protocol", "Token response has no access_token");
    }

    if (typeof expires_in !== "number" || !Number.isFinite(expires_in) || expires_in <= 0) {
        throw new TokenRequestError("protocol", `Token response has an unusable expires_in: ${String(expires_in)}`);
    }

    const refreshToken = typeof refresh_token === "string" && refresh_token ? refresh_token : currentRefreshToken;
    if (!refreshToken) {
        throw new TokenRequestError("protocol", "Token response has no refresh_token");
    }

    return {
        token: access_token,
        refreshToken,
        expiresIn: expires_in,
    };
}

export async function authenticate(): Promise<TokenResponse> {
    const { authorizationEndpoint, tokenEndpoint } = await fetchAuthorizationServerMetadata();
    const [code_verifier, code_challenge] = generatePKCE();
    const redirectHandler = new RedirectHandler();

    try {
        const redirect_uri = await redirectHandler.start();

        // TODO set state parameter to prevent CSRF attacks
        // https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1
        const authorizationUrl = new URL(authorizationEndpoint);
        authorizationUrl.search = new URLSearchParams({
            client_id: OAUTH_CLIENT_ID,
            scope: OAUTH_SCOPE,
            response_type: "code",
            redirect_uri,
            code_challenge,
            code_challenge_method: "S256",
        }).toString();

        openInBrowser(authorizationUrl.toString());

        const callbackUrl = await redirectHandler.waitForCallback();
        const code = callbackUrl.searchParams.get("code");

        if (!code) {
            const denied = callbackUrl.searchParams.get("error");
            throw new TokenRequestError("protocol", denied ? `Authorization failed: ${denied}` : "Callback URL has no authorization code");
        }

        log.debug("Exchanging authorization code for tokens");

        return parseTokenResponse(
            await requestToken(tokenEndpoint, {
                grant_type: "authorization_code",
                client_id: OAUTH_CLIENT_ID,
                scope: OAUTH_SCOPE,
                code,
                code_verifier,
                redirect_uri,
            })
        );
    } finally {
        redirectHandler.close();
    }
}

export async function renewAccessToken(refreshToken: string): Promise<TokenResponse> {
    const { tokenEndpoint } = await fetchAuthorizationServerMetadata();

    log.debug("Renewing access token");

    // A server is allowed to keep the current refresh token rather than rotate it.
    return parseTokenResponse(
        await requestToken(tokenEndpoint, {
            grant_type: "refresh_token",
            client_id: OAUTH_CLIENT_ID,
            scope: OAUTH_SCOPE,
            refresh_token: refreshToken,
        }),
        refreshToken
    );
}
