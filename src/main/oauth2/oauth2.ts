import { OAUTH_AUTHORIZATION_SERVER_URL, OAUTH_CLIENT_ID, OAUTH_SCOPE, OAUTH_WELL_KNOWN_URL } from "@main/config/server";
import { generatePKCE } from "@main/oauth2/pkce";
import RedirectHandler from "@main/oauth2/redirect-handler";
import { accountService } from "@main/services/account.service";
import { logger } from "@main/utils/logger";
import { shell } from "electron";
import { stringify } from "node:querystring";

const log = logger("oauth2-utils");

interface TokenResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
}

//TODO cache this response according to HTTP cache headers returned from server
export async function fetchAuthorizationServerMetadata(): Promise<{
    authorizationEndpoint: string;
    tokenEndpoint: string;
}> {
    const response = await fetch(OAUTH_WELL_KNOWN_URL);
    if (response.status !== 200) {
        const error = `Failed to fetch OAuth2 authorization server metadata: ${response.status} ${response.statusText}`;
        log.error(error);
        throw new Error(error);
    }
    const body = await response.json();
    const { authorization_endpoint, token_endpoint, issuer } = body;
    if (!authorization_endpoint || !token_endpoint || !issuer) {
        const error = "Invalid OAuth2 authorization server metadata";
        log.error(`${error}: ${JSON.stringify(body)}`);
        throw new Error(error);
    }

    if (issuer !== OAUTH_AUTHORIZATION_SERVER_URL) {
        const error = `Invalid OAuth2 issuer: ${issuer} does not match expected ${OAUTH_AUTHORIZATION_SERVER_URL}`;
        log.error(error);
        throw new Error(error);
    }

    return {
        authorizationEndpoint: authorization_endpoint,
        tokenEndpoint: token_endpoint,
    };
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
        openInBrowser(url);
        const callbackUrl = await redirectHandler.waitForCallback();
        log.debug(`Received callback URL: ${callbackUrl}`);
        const code = callbackUrl.searchParams.get("code");
        log.debug(`Received OAuth2 code: ${code}`);
        const tokenUrl = createUrlWithQuerystring(tokenEndpoint, {
            grant_type: "authorization_code",
            client_id: OAUTH_CLIENT_ID,
            scoe: OAUTH_SCOPE,
            code,
            code_verifier,
            redirect_uri,
        });
        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
        });
        if (tokenResponse.status !== 200) {
            const responseText = await tokenResponse.text();
            const error = `Failed to fetch OAuth2 token: ${tokenResponse.status} ${tokenResponse.statusText} ${responseText}`;
            log.error(error);
            throw new Error(error);
        }
        // Refresh token is mandatory for this app to work
        const body = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = body;
        if (!access_token || !refresh_token) {
            const error = "Invalid OAuth2 token response";
            log.error(`${error}: ${JSON.stringify(body)}`);
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

export async function renewAccessToken(): Promise<TokenResponse> {
    log.debug("Renewing access token");
    const { tokenEndpoint } = await fetchAuthorizationServerMetadata();
    const refreshToken = await accountService.getRefreshToken();
    if (!refreshToken) {
        const error = "No refresh token available";
        log.error(error);
        stopTokenRenewer();
        throw new Error(error);
    }
    const tokenUrl = createUrlWithQuerystring(tokenEndpoint, {
        grant_type: "refresh_token",
        client_id: OAUTH_CLIENT_ID,
        scope: OAUTH_SCOPE,
        refresh_token: refreshToken,
    });
    const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
    });
    if (tokenResponse.status !== 200) {
        const error = `Failed to renew token, wiping: ${tokenResponse.status} ${tokenResponse.statusText}`;
        const responseText = await tokenResponse.text();
        log.error(`${error}: ${responseText}`);
        accountService.wipe();
        if (tokenResponse.status === 400) {
            log.error(`400 Bad request: ${tokenUrl}`);
        }
        throw new Error(error);
    }
    const body = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = body;
    if (!access_token || !expires_in) {
        const error = "Invalid OAuth2 token response";
        log.error(`${error}: ${JSON.stringify(body)}`);
        throw new Error(error);
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

let tokenRenewer;
export function startTokenRenewer(interval: number) {
    stopTokenRenewer();
    tokenRenewer = setInterval(renewAccessToken, interval);
}

export function stopTokenRenewer() {
    if (!tokenRenewer) return;
    clearInterval(tokenRenewer);
}
