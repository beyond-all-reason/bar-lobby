// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// One download at a time wastes a connection and unbounded downloads are worse, so a few at once.
//
// This cannot be delegated to pr-downloader's own limit, which applies per invocation: one process
// fetching four maps and four processes fetching one each both look like "four parallel" from inside
// prd while meaning very different things. Only the lobby sees the total.
export const MAX_CONCURRENT_DOWNLOADS = 3;

// How long content nothing is holding on to is kept before a sweep will remove it. Deliberately not a
// user setting: nobody can reason about the right number, and getting it wrong deletes their content.
export const CONTENT_RETENTION_DAYS = 90;

// Refuse to start acquiring with less than this free on the assets volume. A floor rather than a real
// size estimate, because rapid does not tell us how big a game is until it is fetching it; this is
// aimed at the disk that is already full, which is the case that actually fails.
export const MIN_FREE_BYTES_TO_ACQUIRE = 2 * 1024 * 1024 * 1024;
