// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { NewsFeedData } from "@main/services/news.service";

export type FetchNewsRssFeed = (numberOfNews: number) => Promise<NewsFeedData | null | undefined>;
export type FetchDevlogRssFeed = (numberOfNews?: number) => Promise<NewsFeedData | null | undefined>;
