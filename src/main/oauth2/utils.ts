import { OAUTH_AUTHORIZATION_SERVER_URL, OAUTH_CLIENT_ID, WELL_KNOWN_OAUTH_AUTHORIZATION_SERVER_URL } from "@main/config/server";
import { generatePKCE } from "@main/oauth2/pkce";
import RedirectHandler from "@main/oauth2/redirect-handler";
import { logger } from "@main/utils/logger";
import { shell } from "electron";
import { stringify } from "node:querystring";

const log = logger("oauth2-utils");

interface TokenResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
}

export async function fetchAuthorizationServerMetadata(): Promise<{
    authorizationEndpoint: string;
    tokenEndpoint: string;
}> {
    const response = await fetch(WELL_KNOWN_OAUTH_AUTHORIZATION_SERVER_URL);
    if (response.status !== 200) {
        const error = `Failed to fetch OAuth2 authorization server metadata: ${response.status} ${response.statusText}`;
        log.error(error);
        throw new Error(error);
    }
    const { authorization_endpoint, token_endpoint } = await response.json();
    if (!authorization_endpoint || !token_endpoint) {
        const error = "Invalid OAuth2 authorization server metadata";
        log.error(error);
        throw new Error(error);
    }
    // TODO: Remove this hack once the server is fixed
    // see https://github.com/beyond-all-reason/teiserver/pull/555
    const fixedAuthorizationEndpoint = authorization_endpoint.replaceAll(":8888", "");
    const fixedTokenEndpoint = token_endpoint.replaceAll(":8888", "");
    return { authorizationEndpoint: fixedAuthorizationEndpoint, tokenEndpoint: fixedTokenEndpoint };
}

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;
    // Additional checks to prevent opening arbitrary URLs
    if (!url.startsWith(OAUTH_AUTHORIZATION_SERVER_URL)) return;
    shell.openExternal(url);
}

function createUrlWithQuerystring(baseUrl: string, params: Record<string, string | number | boolean>): string {
    const queryString = stringify(params);
    return `${baseUrl}?${queryString}`;
}

export async function authenticate(): Promise<TokenResponse> {
    const { authorizationEndpoint, tokenEndpoint } = await fetchAuthorizationServerMetadata();
    const [code_verifier, code_challenge] = generatePKCE();
    const redirectHandler = new RedirectHandler();
    try {
        const redirect_uri = await redirectHandler.start();
        const url = createUrlWithQuerystring(authorizationEndpoint, {
            client_id: OAUTH_CLIENT_ID,
            response_type: "code",
            redirect_uri,
            code_challenge,
            code_challenge_method: "S256",
        });
        openInBrowser(url);
        const callbackUrl = await redirectHandler.waitForCallback();
        log.debug(`Received callback URL: ${callbackUrl}`);
        const code = callbackUrl.searchParams.get("code");
        log.debug(`Received OAuth2 code: ${code}`);
        const tokenUrl = createUrlWithQuerystring(tokenEndpoint, {
            grant_type: "authorization_code",
            client_id: OAUTH_CLIENT_ID,
            code,
            code_verifier,
            redirect_uri,
        });
        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
        });
        if (tokenResponse.status !== 200) {
            const error = `Failed to fetch OAuth2 token: ${tokenResponse.status} ${tokenResponse.statusText}`;
            log.error(error);
            throw new Error(error);
        }
        const { access_token, refresh_token, expires_in } = await tokenResponse.json();
        if (!access_token || !refresh_token) {
            const error = "Invalid OAuth2 token response";
            log.error(error);
            throw new Error(error);
        }
        return {
            token: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in,
        };
    } catch (error) {
        log.error("Error during login");
        throw error;
    } finally {
        redirectHandler.close();
    }
}

export async function renewAccessToken(refreshToken: string): Promise<TokenResponse> {
    log.debug("Renewing access token");
    const { tokenEndpoint } = await fetchAuthorizationServerMetadata();
    if (!refreshToken) {
        const error = "No refresh token available";
        log.error(error);
        stopTokenRenewer();
        throw new Error(error);
    }
    const tokenUrl = createUrlWithQuerystring(tokenEndpoint, {
        grant_type: "refresh_token",
        client_id: OAUTH_CLIENT_ID,
        refresh_token: refreshToken,
    });
    const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
    });
    if (tokenResponse.status !== 200) {
        const error = `Failed to renew token: ${tokenResponse.status} ${tokenResponse.statusText}`;
        log.error(error);
        throw new Error(error);
    }
    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    if (!access_token || !refresh_token) {
        const error = "Invalid OAuth2 token response";
        log.error(error);
        throw new Error(error);
    }
    log.debug("Renewed access token");
    return {
        token: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
    };
}

let tokenRenewer;
export function startTokenRenewer(interval: number) {
    stopTokenRenewer();
    tokenRenewer = setInterval(renewAccessToken, interval);
}

export function stopTokenRenewer() {
    if (!tokenRenewer) return;
    clearInterval(tokenRenewer);
}
