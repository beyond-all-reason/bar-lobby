import path from "path";
import { MapParser, StartPos } from "spring-map-parser";

import { exposeWorkerFunction } from "@/workers/worker-helpers";

let mapParser: MapParser | undefined;

export const parseMap = exposeWorkerFunction(async (mapPath: string, mapImagesPath: string, path7za: string) => {
    if (!mapParser) {
        mapParser = new MapParser({
            mipmapSize: 8,
            path7za,
        });
    }

    const map = await mapParser.parseMap(mapPath);

    const fileNameWithoutExt = path.parse(mapPath).name;

    await map.textureMap!.quality(80).writeAsync(path.join(mapImagesPath, `${fileNameWithoutExt}-texture.jpg`));
    await map.metalMap.quality(80).writeAsync(path.join(mapImagesPath, `${fileNameWithoutExt}-metal.jpg`));
    await map.heightMap.quality(80).writeAsync(path.join(mapImagesPath, `${fileNameWithoutExt}-height.jpg`));
    await map.typeMap.quality(80).writeAsync(path.join(mapImagesPath, `${fileNameWithoutExt}-type.jpg`));

    return {
        fileName: path.parse(mapPath).base,
        scriptName: map.scriptName.trim(),
        friendlyName: map.mapInfo?.name || map.scriptName.trim().replace(/[_-]/g, " "),
        description: map.mapInfo?.description || map.smd?.description || null,
        mapHardness: map.mapInfo?.maphardness ?? map.smd?.mapHardness!,
        gravity: map.mapInfo?.gravity ?? map.smd?.gravity!,
        tidalStrength: map.mapInfo?.tidalStrength ?? map.smd?.tidalStrength!,
        maxMetal: map.mapInfo?.maxMetal ?? map.smd?.maxMetal!,
        extractorRadius: map.mapInfo?.extractorRadius ?? map.smd?.extractorRadius!,
        minWind: map.mapInfo?.atmosphere?.minWind ?? map.smd?.minWind!,
        maxWind: map.mapInfo?.atmosphere?.maxWind ?? map.smd?.maxWind!,
        startPositions: (map.mapInfo?.teams?.map((obj) => obj!.startPos) ?? map.smd?.startPositions) as Array<StartPos>,
        width: map.smf!.mapWidthUnits * 2,
        height: map.smf!.mapHeightUnits * 2,
        minDepth: map.minHeight,
        maxDepth: map.maxHeight,
        mapInfo: map.mapInfo || null,
    };
});
