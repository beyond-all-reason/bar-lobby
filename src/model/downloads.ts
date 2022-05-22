export type DownloadInfo = {
    type: "engine" | "game" | "map";
    name: string;
    currentBytes: number;
    totalBytes: number;
};
