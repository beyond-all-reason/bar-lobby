// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";

/**
 * A live reason not to delete content, asked for at the moment it matters rather than recorded when it
 * begins and forgotten when it ends. Nothing is stored, so a holder that goes away without saying so
 * cannot leave content protected forever, and there is no release to get wrong.
 */
export type ClaimSource = {
    readonly name: string;
    claims(): ContentRef[];
};

// Nothing registers a claim source yet and nothing calls sweep, so no policy about what is worth
// keeping has been decided. These sketch the shape that discussion would take rather than settling it,
// and are left disconnected so they are not mistaken for a decision that was made.
//
// export const replayClaims: ClaimSource = {
//     name: "replays",
//     claims: () =>
//         replaysAPI.cachedReplays().flatMap((replay) => [
//             { type: "engine", id: replay.engineVersion },
//             { type: "game", id: replay.gameVersion },
//             { type: "map", id: replay.mapSpringName },
//         ]),
// };
//
// export const defaultVersionClaims: ClaimSource = {
//     name: "defaults",
//     claims: () => [{ type: "engine", id: DEFAULT_ENGINE_VERSION }],
// };
//
// export const runningGameClaims: ClaimSource = {
//     name: "running game",
//     claims: () => (gameAPI.isGameRunning() ? gameAPI.launchedContent() : []),
// };
