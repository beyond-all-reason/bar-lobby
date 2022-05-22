import type { DeepPartial } from "jaz-ts-utils";
import type { MapInfo } from "spring-map-parser";

export type MapData = {
    scriptName: string;
    fileName: string;
    fileNameWithExt: string;
    friendlyName: string;
    description?: string;
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
    mapInfo?: DeepPartial<MapInfo>;
    textureImagePath?: string;
    heightImagePath?: string;
    metalImagePath?: string;
    typeImagePath?: string;
};
