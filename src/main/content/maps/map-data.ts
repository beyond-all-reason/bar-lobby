import { MapMetadata } from "@main/content/maps/online-map";

export type MapData = MapMetadata & {
    imagesBlob?: {
        preview?: Blob;
    };
    isInstalled?: boolean;
    isDownloading?: boolean;
};
