// test/index.spec.ts
import { SELF, fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, expect, it } from "vitest";
import * as jose from "jose";

const issuer = "https://token.actions.githubusercontent.com";

beforeAll(() => {
    // Enable outbound request mocking...
    fetchMock.activate();
    // ...and throw errors if an outbound request isn't mocked
    fetchMock.disableNetConnect();
});

// Ensure we matched every mock we defined
afterEach(() => fetchMock.assertNoPendingInterceptors());

const JWK = {
    kty: "EC",
    d: "IdHMBoM8Me4ZeWqzyB1fbl9b-bF3MZS8aWQBDxVQXco",
    use: "sig",
    crv: "P-256",
    kid: "key-1",
    x: "z2e6rmfCjRLW1n1jGdAFFO_7fHKVlsiEjkNwiHTT4Qw",
    y: "rDJbjwBV2UInIgW-YeUtnh7n9TjLzKa2eZZlsJUVfaU",
    alg: "ES256",
};

function setFetchMocks() {
    fetchMock
        .get(issuer)
        .intercept({ path: "/.well-known/openid-configuration" })
        .reply(200, JSON.stringify({ issuer, jwks_uri: `${issuer}/keys` }));
    fetchMock
        .get(issuer)
        .intercept({ path: "/keys" })
        .reply(200, JSON.stringify({ keys: [{ ...JWK, d: undefined }] }));
}

it("simple valid set and get flow works", async () => {
    setFetchMocks();

    const configUrl = "https://lobby-config.example.com/config.json";
    const exampleConfig = {
        configUrl,
        someProperty: 1,
    };

    const jwt = await new jose.SignJWT({
        repository: "beyond-all-reason/bar-lobby",
        other_prop: "asd",
    })
        .setProtectedHeader({ alg: JWK.alg, kid: JWK.kid })
        .setIssuer(issuer)
        .setAudience(configUrl)
        .setExpirationTime("2h")
        .sign(await jose.importJWK(JWK));

    const setResp = await SELF.fetch(configUrl, {
        method: "PUT",
        body: JSON.stringify(exampleConfig),
        headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(setResp.status).toBe(200);

    const getResp = await SELF.fetch(configUrl);
    expect(setResp.status).toBe(200);
    expect(await getResp.json()).toEqual(exampleConfig);
});

it("404 on bad path", async () => {
    const badPath = await SELF.fetch("https://lobby-config.example.com/somepath");
    expect(badPath.status).toBe(404);
});

it("404 when not set", async () => {
    const notSetyetResp = await SELF.fetch("https://lobby-config.example.com/config.json");
    expect(notSetyetResp.status).toBe(404);
});

it("403 when not matching claim", async () => {
    setFetchMocks();

    const configUrl = "https://lobby-config.example.com/config.json";
    const jwt = await new jose.SignJWT({
        repository: "beyond-all-reason-fake-fake/bar-lobby",
        other_prop: "asd",
    })
        .setProtectedHeader({ alg: JWK.alg, kid: JWK.kid })
        .setIssuer(issuer)
        .setAudience(configUrl)
        .setExpirationTime("2h")
        .sign(await jose.importJWK(JWK));

    const resp = await SELF.fetch(configUrl, {
        method: "PUT",
        body: "{}",
        headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(resp.status).toBe(403);
    expect(resp.headers.get("WWW-Authenticate")).toMatchInlineSnapshot(
        `"Bearer realm="lobby-config" error="insufficient_scope" error_description="Missing required claim: repository or its value does not match""`
    );
});

it("set blocks not matching configUrl", async () => {
    setFetchMocks();

    const configUrl = "https://lobby-config.example.com/config.json";
    const jwt = await new jose.SignJWT({ repository: "beyond-all-reason/bar-lobby" })
        .setProtectedHeader({ alg: JWK.alg, kid: JWK.kid })
        .setIssuer(issuer)
        .setAudience(configUrl)
        .setExpirationTime("2h")
        .sign(await jose.importJWK(JWK));

    const resp = await SELF.fetch(configUrl, {
        method: "PUT",
        body: JSON.stringify({
            configUrl: "badvalue",
        }),
        headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(resp.status).toBe(400);
    expect(await resp.text()).toMatch(/Bad new config/i);
});
