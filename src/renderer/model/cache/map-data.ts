import type { DeepPartial } from "jaz-ts-utils";
import { Generated, Selectable } from "kysely";
import type { MapInfo } from "spring-map-parser";

export type MapDataTable = {
    mapId: Generated<number>;
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
    lastLaunched: Date | null;
};

export type MapData = Selectable<MapDataTable>;
