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

const RSS_URL = "https://www.beyondallreason.info/news/rss.xml";
const MAX_NEWS_TO_LOAD = 7;

let newsFeed: NewsFeedData | null = null;

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

async function fetchNewsRssFeed() {
    try {
        if (newsFeed) {
            return newsFeed;
        }
        newsFeed = (await extract(
            RSS_URL,
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
            newsFeed.entries.slice(0, MAX_NEWS_TO_LOAD).map(async (entry) => {
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

function registerIpcHandlers() {
    ipcMain.handle("misc:getNewsRssFeed", fetchNewsRssFeed);
}

export const miscService = {
    registerIpcHandlers,
};
