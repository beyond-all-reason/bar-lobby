// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// 2-4 asked for in https://github.com/beyond-all-reason/bar-lobby/issues/423#issuecomment-2988283498
// Counts invocations, not connections: a game is one slot and fans out inside prd.
export const MAX_CONCURRENT_DOWNLOADS = 4;

// How long content nothing is holding on to is kept before a sweep will remove it. Deliberately not a
// user setting: nobody can reason about the right number, and getting it wrong deletes their content.
export const CONTENT_RETENTION_DAYS = 90;

// Refuse to start acquiring with less than this free on the assets volume. A floor rather than a real
// size estimate, because rapid does not tell us how big a game is until it is fetching it; this is
// aimed at the disk that is already full, which is the case that actually fails.
export const MIN_FREE_BYTES_TO_ACQUIRE = 2 * 1024 * 1024 * 1024;
