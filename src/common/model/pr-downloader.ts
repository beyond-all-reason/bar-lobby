export type PrdDownloadType = "engine" | "game" | "map";

export type PrdProgressMessage = {
    downloadType: PrdDownloadType;
    content: string;
    currentBytes: number;
    totalBytes: number;
    parsedPercent: number;
};

export type RapidVersion = {
    tag: string;
    md5: string;
    version: string;
};
