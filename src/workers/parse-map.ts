import { MapParser } from "spring-map-parser";

import { exposeWorkerFunctions } from "@/workers/worker-helpers";

let mapParser: MapParser | undefined;

async function parseMap(mapPath: string, path7za: string) {
    if (!mapParser) {
        mapParser = new MapParser({
            mipmapSize: 8,
            path7za,
        });
    }

    return mapParser.parseMap(mapPath);
}

export default exposeWorkerFunctions({
    parseMap,
});
