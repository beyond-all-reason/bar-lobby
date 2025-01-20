import * as jose from "jose";

/**
 * Verifies that given request contains an access granting OIDC token in Authorization header.
 *
 * Normally when using OpenID Connect the client that wants to access some API must to first
 * exchange that ID token using e.g. RFC 8693 for a short lived access token for that API and
 * then call the desired API again. Here, because it's a single endpoint, we don't do this dance
 * and perform full authentication and authorization using only the ID token.
 *
 * The function takes the OIDC Provider issuer URL and a set of required claims on the passed
 * in ID token. It then verifies that JWT passed in according to RFC 6750 is singed by issuer
 * keys and contains the set of required claims.
 *
 * To ensure that a valid leaked ID token for a different purpose can't be against the API, the
 * function requires that the `aud` is set to the request URL.
 *
 * @param request The request
 * @param realm The realm for WWW-Authenticate header
 * @param issuer OIDC Provider issuer URL
 * @param requiredClaims Map of required claims and their values
 * @returns A HTTP response, code 204 means that check was successful, otherwise a proper error is returned.
 */
export async function checkAccess(request: Request, realm: string, issuer: string, requiredClaims: { [claimName: string]: string }): Promise<Response> {
    // We return errors according to RFC 6750.
    const authzHeader = request.headers.get("Authorization");
    if (!authzHeader) {
        return new Response("Not authorized", {
            status: 401,
            headers: { "WWW-Authenticate": `Bearer realm="${realm}"` },
        });
    }
    const match = /^Bearer (?<token>[-a-zA-Z0-9._~+/]+=*)$/.exec(authzHeader);
    if (match === null) {
        return new Response("Bad request", {
            status: 400,
            headers: { "WWW-Authenticate": `Bearer realm="${realm}" error="invalid_request" error_description="Malformed Authorization header value"` },
        });
    }
    const jwt = match.groups!.token;

    try {
        const JWKS = await fetchJWKS(issuer);
        const { payload } = await jose.jwtVerify(jwt, JWKS, {
            issuer,
            audience: request.url,
        });
        for (const [claim, expectedValue] of Object.entries(requiredClaims)) {
            if (!(claim in payload) || payload[claim] !== expectedValue) {
                return new Response("Forbidden", {
                    status: 403,
                    headers: { "WWW-Authenticate": `Bearer realm="${realm}" error="insufficient_scope" error_description="Missing required claim: ${claim} or its value does not match"` },
                });
            }
        }
        return new Response(null, { status: 204 });
    } catch (err) {
        if (err instanceof jose.errors.JOSEError && !["ERR_JWKS_INVALID", "ERR_JWKS_TIMEOUT"].includes(err.code)) {
            return new Response("Not authorized", {
                status: 401,
                headers: { "WWW-Authenticate": `Bearer realm="${realm}" error="invalid_token" error_description="JWT validation failed with ${err.code}"` },
            });
        } else {
            return new Response("Bad response from issuer", {
                status: 502,
            });
        }
    }
}

async function fetchJWKS(issuer: string) {
    const resp = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (!resp.ok) {
        throw Error(`Failed to fetch openid configuration: ${resp.statusText}`);
    }
    const config = await resp.json();
    if (!config || typeof config !== "object" || !("issuer" in config) || !("jwks_uri" in config) || config.issuer !== issuer || typeof config.jwks_uri !== "string") {
        throw Error(`Invalid openid configuration returned`);
    }
    return jose.createRemoteJWKSet(new URL(config.jwks_uri));
}
