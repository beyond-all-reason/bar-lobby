import { MapMetadata } from "@main/content/maps/map-metadata";

export type MapData = MapMetadata &
    MapDownloadData & {
        imagesBlob?: {
            preview?: Blob;
        };
        isFavorite?: boolean;
    };

export type MapDownloadData = {
    springName: string;
    isInstalled?: boolean;
    isDownloading?: boolean;
};
