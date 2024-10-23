import type { DeepPartial } from "$/jaz-ts-utils/types";
import { MapInfo } from "$/map-parser/map-model";

export type MapData = {
    scriptName: string;
    fileName: string;
    friendlyName: string;
    description: string | null;
    mapHardness: number;
    gravity: number;
    tidalStrength: number;
    maxMetal: number;
    extractorRadius: number;
    minWind: number;
    maxWind: number;
    startPositions: Array<{
        x: number;
        z: number;
    }> | null;
    width: number;
    height: number;
    minDepth: number;
    maxDepth: number;
    mapInfo: DeepPartial<MapInfo> | null;
    lastLaunched: Date;
    images: {
        texture: string;
        height: string;
        metal: string;
        type: string;
    };
};

export function mapFileNameToFriendlyName(fileName: string) {
    const friendlyName = fileName
        .replace(/\.sd7$/, "")
        .replaceAll("_", " ")
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
        .join(" ");
    return friendlyName;
}
