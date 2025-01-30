import { MapMetadata } from "@main/content/maps/map-metadata";

export type MapData = MapMetadata & {
    imagesBlob?: {
        preview?: Blob;
    };
    isInstalled?: boolean;
    isDownloading?: boolean;
    isFavorite?: boolean;
};
