import { checkAccess } from "./checkAccess.js";

function isConfigValid(newConfig: string, expectedConfigUrl: string): boolean {
    try {
        const c = JSON.parse(newConfig) as unknown;
        // We basically verify that `configUrl` is set to the current address, this
        // is the main condition to be able to undo a bad config push.
        return typeof c === "object" && c !== null && "configUrl" in c && c.configUrl === expectedConfigUrl;
    } catch {
        // JSON parse failed
        return false;
    }
}

async function handleConfigPush(request: Request, env: Env): Promise<Response> {
    const accessResp = await checkAccess(request, "lobby-config", env.OIDC_ISSUER, env.OIDC_TOKEN_REQUIRED_CLAIMS);
    if (!accessResp.ok) {
        return accessResp;
    }
    const newConfig = await request.text();
    const url = new URL(request.url);
    if (!isConfigValid(newConfig, url.origin + url.pathname)) {
        return new Response(`Bad new config`, { status: 400 });
    }
    await env.CONFIG_KV.put("config.json", newConfig);
    return new Response("Ok", { status: 200 });
}

export default {
    async fetch(request, env): Promise<Response> {
        const allowedMethods = ["GET", "HEAD", "PUT"];
        if (!allowedMethods.includes(request.method)) {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: { Allow: allowedMethods.join(", ") },
            });
        }
        const url = new URL(request.url);
        if (url.pathname !== "/config.json") {
            return new Response("Not Found", { status: 404 });
        }

        if (request.method === "PUT") {
            return handleConfigPush(request, env);
        }

        const config = await env.CONFIG_KV.get("config.json");
        if (config === null) {
            return new Response("config.json not set", { status: 404 });
        }
        return new Response(config, {
            status: 200,
            headers: new Headers({ "Content-Type": "application/json" }),
        });
    },
} satisfies ExportedHandler<Env>;
