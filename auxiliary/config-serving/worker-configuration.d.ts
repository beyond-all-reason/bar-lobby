// Generated by Wrangler by running `wrangler types`

interface Env {
    CONFIG_KV: KVNamespace;
    OIDC_ISSUER: "https://token.actions.githubusercontent.com";
    OIDC_TOKEN_REQUIRED_CLAIMS: { repository: "beyond-all-reason/bar-lobby" } | { repository: "beyond-all-reason/bar-lobby"; ref: "refs/heads/master" };
}
