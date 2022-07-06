export enum DownloadType {
    Metadata,
    Engine,
    Game,
    Map,
}

export interface Message {
    type: string;
    parts: string[];
}

export interface ProgressMessage extends Message {
    type: "Progress";
    currentBytes: number;
    totalBytes: number;
    parsedPercent: number;
    downloadType: DownloadType;
}

export type RapidVersion = {
    tag: string;
    md5: string;
    version: string;
};
