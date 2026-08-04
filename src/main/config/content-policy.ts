// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// One download at a time wastes a connection and unbounded downloads are worse, so a few at once.
//
// This cannot be delegated to pr-downloader's own limit, which applies per invocation: one process
// fetching four maps and four processes fetching one each both look like "four parallel" from inside
// prd while meaning very different things. Only the lobby sees the total.
export const MAX_CONCURRENT_DOWNLOADS = 3;
