import { extract, FeedData, FeedEntry } from "@extractus/feed-extractor";
import { logger } from "@main/utils/logger";
import { ipcMain } from "electron";

export interface NewsFeedData extends FeedData {
    entries?: Array<NewsFeedEntry>;
}

export interface NewsFeedEntry extends FeedEntry {
    thumbnail?: string;
    thumbnailUrl?: string;
}

const log = logger("news.service.ts");

const NEWS_RSS_URL = "https://www.beyondallreason.info/news/rss.xml";
const DEVLOG_RSS_URL = "https://www.beyondallreason.info/microblogs/rss.xml";

export async function fetchImageToBase64(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString("base64");
        const contentType = response.headers.get("content-type");
        return `data:${contentType};base64,${base64Image}`;
    } catch (error) {
        log.error("Error fetching image:", error);
    }
}

let newsFeed: NewsFeedData | null = null;
async function fetchNewsRssFeed(numberOfNews: number): Promise<NewsFeedData | null> {
    try {
        if (newsFeed) {
            return newsFeed;
        }
        newsFeed = (await extract(
            NEWS_RSS_URL,
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getExtraEntryFields: (entry: any) => {
                    const thumbnail = entry["media:thumbnail"];
                    const thumbnailUrl = thumbnail ? thumbnail["@_url"] : null;
                    if (thumbnailUrl) {
                        return {
                            thumbnailUrl,
                        };
                    }
                },
            },
            {}
        )) as NewsFeedData;
        newsFeed.entries = await Promise.all(
            newsFeed.entries
                .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
                .slice(0, numberOfNews)
                .map(async (entry) => {
                    if (entry.thumbnailUrl) {
                        entry.thumbnail = await fetchImageToBase64(entry.thumbnailUrl);
                    }
                    return entry;
                })
        );
        return newsFeed;
    } catch (error) {
        log.error("Error fetching news feed:", error);
    }
}

let devlogFeed: NewsFeedData | null = null;
async function fetchDevlogRssFeed(): Promise<NewsFeedData | null> {
    try {
        if (devlogFeed) {
            return devlogFeed;
        }
        devlogFeed = (await extract(DEVLOG_RSS_URL, {}, {})) as NewsFeedData;
        return devlogFeed;
    } catch (error) {
        log.error("Error fetching devlog feed:", error);
    }
}

function registerIpcHandlers() {
    ipcMain.handle("misc:getNewsRssFeed", (_event, numberOfNews: number) => fetchNewsRssFeed(numberOfNews));
    ipcMain.handle("misc:getDevlogRssFeed", () => fetchDevlogRssFeed());
}

export const miscService = {
    registerIpcHandlers,
};
