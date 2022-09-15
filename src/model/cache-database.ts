import { MapData } from "@/model/map-data";
import { ReplayData } from "@/model/replay";

export interface CacheDatabase {
    map: MapData;
    mapError: { fileName: string };
    replay: ReplayData;
    replayError: { fileName: string };
}
