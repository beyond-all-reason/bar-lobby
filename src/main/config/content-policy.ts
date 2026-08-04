// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// One download at a time wastes a connection and unbounded downloads are worse. 2-4 is the range asked
// for in https://github.com/beyond-all-reason/bar-lobby/issues/423#issuecomment-2988283498.
//
// This counts invocations rather than connections, and cannot be delegated to pr-downloader's own limit,
// which applies per invocation and so says nothing about how many of them exist. A game is one slot here
// while fetching many files at once inside prd, which is prd's business to bound.
export const MAX_CONCURRENT_DOWNLOADS = 4;

// How long content nothing is holding on to is kept before a sweep will remove it. Deliberately not a
// user setting: nobody can reason about the right number, and getting it wrong deletes their content.
export const CONTENT_RETENTION_DAYS = 90;

// Refuse to start acquiring with less than this free on the assets volume. A floor rather than a real
// size estimate, because rapid does not tell us how big a game is until it is fetching it; this is
// aimed at the disk that is already full, which is the case that actually fails.
export const MIN_FREE_BYTES_TO_ACQUIRE = 2 * 1024 * 1024 * 1024;
