<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: CC0-1.0
-->

# Redirector

Cloudflare Worker serving <https://barrts.app>.

For now it's a placeholder page; it will grow into a redirector for lobby links.

Run locally with `npm run dev`, deploy with `npm run deploy`.

Types for the Worker runtime and bindings are generated from `wrangler.jsonc` by
`wrangler types` into `worker-configuration.d.ts`, which is not checked in;
`npm run typecheck` regenerates it first.
