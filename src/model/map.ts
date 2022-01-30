import { DeepPartial } from "jaz-ts-utils";
import { MapInfo } from "spring-map-parser";

export interface MapData {
    scriptName: string;
    fileName: string;
    fileNameWithExt: string;
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
}