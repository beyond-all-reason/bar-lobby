// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { OAUTH_CLIENT_ID, OAUTH_SCOPE, getOAuthAuthorizationServerURL, getOAuthWellKnownURL } from "@main/config/server";
import { generatePKCE } from "@main/oauth2/pkce";
import RedirectHandler from "@main/oauth2/redirect-handler";
import { accountService } from "@main/services/account.service";
import { logger } from "@main/utils/logger";
import { shell } from "electron";

const log = logger("oauth2-utils");

export class OAuth2Error extends Error {
    constructor(
        message: string,
        public isTransient: boolean
    ) {
        super(message);
        this.name = "OAuth2Error";
    }
}

export class OAuthUserCancelledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OAuthUserCancelledError";
    }
}

export interface TokenResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthorizationServerMetadata {
    authorizationEndpoint: string;
    tokenEndpoint: string;
}

interface WellKnownPayload {
    authorization_endpoint?: string;
    token_endpoint?: string;
    issuer?: string;
}

interface TokenPayload {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
}

function redactTokenPayloadForLogging(payload: TokenPayload): Record<string, unknown> {
    return {
        access_token: payload.access_token ? "[REDACTED]" : payload.access_token,
        refresh_token: payload.refresh_token ? "[REDACTED]" : payload.refresh_token,
        expires_in: payload.expires_in,
    };
}

// Default cache lifetime to use whenever the server provides no explicit expiration instructions
const DEFAULT_METADATA_MAX_AGE_SECONDS = 3600;
// Dont pin stale endpoints in memory indefinitely
const MAX_METADATA_MAX_AGE_SECONDS = 86400;
// Maximum time to wait for a response
const METADATA_FETCH_TIMEOUT_MS = 10000;
// Maximum time to wait for a response from the token endpoint
const TOKEN_FETCH_TIMEOUT_MS = 10000;

let cachedMetadata: AuthorizationServerMetadata | null = null;
let activeFetchPromise: Promise<AuthorizationServerMetadata> | null = null;
let metadataExpiresAt = 0;
let fetchId = 0;

export function fetchAuthorizationServerMetadata(): Promise<AuthorizationServerMetadata> {
    // If we have a cache and it hasn't expired yet, use it
    if (cachedMetadata && Date.now() < metadataExpiresAt) {
        return Promise.resolve(cachedMetadata);
    }

    // If it's expired, clear the cached payload
    if (cachedMetadata) {
        cachedMetadata = null;
        metadataExpiresAt = 0;
    }

    // Return active fetch if one is already in-flight
    if (activeFetchPromise) {
        return activeFetchPromise;
    }

    // Otherwise, begin a new fetch
    const currentFetchId = ++fetchId;
    activeFetchPromise = fetchMetadata()
        .then(({ metadata, expiresAt }) => {
            if (currentFetchId === fetchId) {
                cachedMetadata = metadata;
                metadataExpiresAt = expiresAt;
                activeFetchPromise = null;
            }
            return metadata;
        })
        .catch((error) => {
            if (currentFetchId === fetchId) {
                activeFetchPromise = null;
            }
            throw error;
        });

    return activeFetchPromise;
}

export function invalidateAuthorizationServerMetadataCache(): void {
    cachedMetadata = null;
    metadataExpiresAt = 0;
    activeFetchPromise = null;
    fetchId++; // Prevents any currently in-flight fetch from populating the cache
    log.debug("OAuth2 metadata cache was manually invalidated");
}

function getCacheTtlMs(response: Response): number {
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) {
        const directives = cacheControl
            .toLowerCase()
            .split(",")
            .map((directive) => directive.trim());
        if (directives.includes("no-store") || directives.includes("no-cache")) return 0;
        const maxAgeDirective = directives.find((directive) => directive.startsWith("max-age="));
        if (maxAgeDirective) {
            const maxAge = Number(maxAgeDirective.slice("max-age=".length));
            if (Number.isFinite(maxAge)) {
                return Math.min(Math.max(0, maxAge), MAX_METADATA_MAX_AGE_SECONDS) * 1000;
            }
        }
    }
    const expiresHeader = response.headers.get("expires");
    if (expiresHeader) {
        const expiresAtMs = Date.parse(expiresHeader);
        if (!Number.isNaN(expiresAtMs)) {
            return Math.min(Math.max(0, expiresAtMs - Date.now()), MAX_METADATA_MAX_AGE_SECONDS * 1000);
        }
    }
    return DEFAULT_METADATA_MAX_AGE_SECONDS * 1000;
}

async function fetchMetadata(): Promise<{ metadata: AuthorizationServerMetadata; expiresAt: number }> {
    let response: Response;
    try {
        response = await fetch(getOAuthWellKnownURL(), {
            signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to fetch OAuth2 authorization server metadata (network error): ${message}`);
        throw new OAuth2Error(message, true);
    }

    if (response.status !== 200) {
        const isTransient = response.status === 429 || response.status >= 500;
        const error = `Failed to fetch OAuth2 authorization server metadata: ${response.status} ${response.statusText}`;
        log.error(error);
        throw new OAuth2Error(error, isTransient);
    }

    let body: WellKnownPayload;
    try {
        body = (await response.json()) as WellKnownPayload;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorStr = `Invalid JSON in OAuth2 authorization server metadata: ${message}`;
        log.error(errorStr);
        // Treat as transient
        throw new OAuth2Error(errorStr, true);
    }

    const { authorization_endpoint, token_endpoint, issuer } = body;
    if (!authorization_endpoint || !token_endpoint || !issuer) {
        const error = "Invalid OAuth2 authorization server metadata";
        log.error(`${error}: ${JSON.stringify(body)}`);
        throw new OAuth2Error(error, false);
    }

    if (issuer !== getOAuthAuthorizationServerURL()) {
        const error = `Invalid OAuth2 issuer: ${issuer} does not match expected ${getOAuthAuthorizationServerURL()}`;
        log.error(error);
        throw new OAuth2Error(error, false);
    }

    const expiresAt = Date.now() + getCacheTtlMs(response);

    return {
        metadata: {
            authorizationEndpoint: authorization_endpoint,
            tokenEndpoint: token_endpoint,
        },
        expiresAt,
    };
}

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
async function openInBrowser(urlString: string): Promise<void> {
    let url: URL;
    try {
        url = new URL(urlString);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid URL passed to openInBrowser: ${urlString} - ${message}`);
    }
    if (url.protocol !== "https:") {
        throw new Error(`Refusing to open URL with disallowed protocol: ${url.protocol}`);
    }
    // Additional checks to prevent opening arbitrary URLs
    if (url.origin !== new URL(getOAuthAuthorizationServerURL()).origin) {
        throw new Error("Refusing to open URL that does not match the expected OAuth2 authorization server");
    }
    try {
        await shell.openExternal(urlString);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to open URL in external browser: ${message}`);
    }
}

function createUrlWithQuerystring(baseUrl: string, params: Record<string, string | number | boolean>): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, String(value));
    }
    return url.toString();
}

export async function authenticate(): Promise<TokenResponse> {
    const { authorizationEndpoint, tokenEndpoint } = await fetchAuthorizationServerMetadata();
    const [code_verifier, code_challenge] = generatePKCE();
    const redirectHandler = new RedirectHandler();
    try {
        const redirect_uri = await redirectHandler.start();
        // TODO set state parameter to prevent CSRF attacks
        // https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1
        const url = createUrlWithQuerystring(authorizationEndpoint, {
            client_id: OAUTH_CLIENT_ID,
            scope: OAUTH_SCOPE,
            response_type: "code",
            redirect_uri,
            code_challenge,
            code_challenge_method: "S256",
        });
        await openInBrowser(url);
        const callbackUrl = await redirectHandler.waitForCallback();
        log.debug(`Received callback URL: ${callbackUrl}`);

        const oauthError = callbackUrl.searchParams.get("error");
        if (oauthError) {
            const errorDescription = callbackUrl.searchParams.get("error_description") || "Unknown error";
            if (oauthError === "access_denied") {
                throw new OAuthUserCancelledError(errorDescription);
            }
            throw new Error(`OAuth2 error: ${oauthError} - ${errorDescription}`);
        }

        const code = callbackUrl.searchParams.get("code");
        if (!code) throw new Error("Callback URL code is not specified");

        log.debug(`Received OAuth2 code: ${code}`);

        const bodyParams = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: OAUTH_CLIENT_ID,
            scope: OAUTH_SCOPE,
            code,
            code_verifier,
            redirect_uri,
        });

        const tokenResponse = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams,
            signal: AbortSignal.timeout(TOKEN_FETCH_TIMEOUT_MS),
        });

        if (tokenResponse.status !== 200) {
            const responseText = await tokenResponse.text();
            const error = `Failed to fetch OAuth2 token: ${tokenResponse.status} ${tokenResponse.statusText} ${responseText}`;
            log.error(error);
            throw new Error(error);
        }

        let body: TokenPayload;
        try {
            body = (await tokenResponse.json()) as TokenPayload;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const errorStr = `Invalid JSON in OAuth2 token response: ${message}`;
            log.error(errorStr);
            throw new Error(errorStr);
        }

        // Refresh token is mandatory for this app to work
        const { access_token, refresh_token, expires_in } = body;
        if (!access_token || !refresh_token || typeof expires_in !== "number") {
            const error = "Invalid OAuth2 token response";
            log.error(`${error}: ${JSON.stringify(redactTokenPayloadForLogging(body))}`);
            throw new Error(error);
        }
        return {
            token: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof OAuthUserCancelledError) {
            log.info(`Login was cancelled by the user: ${message}`);
        } else {
            log.error(`Error during login: ${message}`);
        }
        throw error;
    } finally {
        redirectHandler.close();
    }
}

export async function renewAccessToken(): Promise<TokenResponse> {
    log.debug("Renewing access token");

    const refreshToken = await accountService.getRefreshToken();
    if (!refreshToken) {
        const error = "No refresh token available";
        log.error(error);
        stopTokenRenewer();
        throw new OAuth2Error(error, false);
    }

    let tokenEndpoint: string;
    try {
        ({ tokenEndpoint } = await fetchAuthorizationServerMetadata());
    } catch (error) {
        if (error instanceof OAuth2Error) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new OAuth2Error(message, true);
    }

    const bodyParams = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: OAUTH_CLIENT_ID,
        scope: OAUTH_SCOPE,
        refresh_token: refreshToken,
    });

    let tokenResponse: Response;
    try {
        tokenResponse = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams,
            signal: AbortSignal.timeout(TOKEN_FETCH_TIMEOUT_MS),
        });
    } catch (error) {
        log.error(`Failed to renew token (network error): ${error}`);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new OAuth2Error(errorMessage, true);
    }

    if (tokenResponse.status !== 200) {
        const isTransient = tokenResponse.status === 429 || tokenResponse.status >= 500;
        const error = `Failed to renew token${isTransient ? " (transient)" : ", wiping"}: ${tokenResponse.status} ${tokenResponse.statusText}`;
        const responseText = await tokenResponse.text();
        log.error(`${error}: ${responseText}`);

        if (!isTransient) {
            // This is a persistent error, wipe the data
            try {
                await accountService.wipe();
            } catch (wipeError) {
                log.error(`Failed to wipe account data: ${wipeError}`);
            }
        }

        if (tokenResponse.status === 400) {
            log.error(`400 Bad request: ${tokenEndpoint}`);
        }

        throw new OAuth2Error(error, isTransient);
    }

    let body: TokenPayload;
    try {
        body = (await tokenResponse.json()) as TokenPayload;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorStr = `Invalid JSON in OAuth2 token renewal response: ${message}`;
        log.error(errorStr);
        throw new OAuth2Error(errorStr, true);
    }

    const { access_token, refresh_token, expires_in } = body;
    if (!access_token || typeof expires_in !== "number") {
        const error = "Invalid OAuth2 token response";
        log.error(`${error}: ${JSON.stringify(redactTokenPayloadForLogging(body))}`);

        throw new OAuth2Error(error, false);
    }
    if (!refresh_token) {
        log.info("No new refresh token in token response, keeping the current one.");
    }
    log.debug("Renewed access token");
    return {
        token: access_token,
        refreshToken: refresh_token ? refresh_token : refreshToken,
        expiresIn: expires_in,
    };
}

let tokenRenewer: NodeJS.Timeout | undefined;
let isRenewing = false;
let renewerGeneration = 0;

async function renewAndSaveTokens(generation: number): Promise<void> {
    // Prevents pile-ups if the interval is short or network is slow
    if (isRenewing) return;
    isRenewing = true;

    try {
        const value = await renewAccessToken();
        // A stop or restart happened while this was in flight
        if (generation !== renewerGeneration) return;
        await accountService.saveRefreshToken(value.refreshToken);
        await accountService.saveToken(value.token);
        log.info("Saved new tokens.");
    } catch (error) {
        log.error(`Failed to renew access token in background loop: ${error}`);

        if (generation !== renewerGeneration) return;

        // The error is persistent, stop any background attempts
        if (error instanceof OAuth2Error && !error.isTransient) {
            stopTokenRenewer();
        }
    } finally {
        isRenewing = false;
    }
}

export function startTokenRenewer(interval: number) {
    stopTokenRenewer();
    const generation = ++renewerGeneration;
    tokenRenewer = setInterval(() => {
        void renewAndSaveTokens(generation);
    }, interval);
}

export function stopTokenRenewer() {
    renewerGeneration++;
    if (!tokenRenewer) return;
    clearInterval(tokenRenewer);
    tokenRenewer = undefined;
}
