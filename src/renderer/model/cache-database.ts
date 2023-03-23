import { GameVersionTable } from "@/model/game-version";
import { MapDataTable } from "@/model/map-data";
import { ReplayTable } from "@/model/replay";

export interface CacheDatabase {
    map: MapDataTable;
    mapError: { fileName: string };
    replay: ReplayTable;
    replayError: { fileName: string };
    game_versions: GameVersionTable;
}
