import { StartPos } from "$/map-parser/map-model";
import { MapParser } from "$/map-parser/spring-map-parser";
import path from "path";
import { MapData } from "@main/content/maps/map-data";
import { Worker } from "worker_threads";
import { MIPMAP_SIZE } from "@main/config/map-parsing";

const mapParser = new MapParser({
    mipmapSize: MIPMAP_SIZE,
});

export const parseMap = async (mapPath: string) => {
    const map = await mapParser.parseMap(mapPath);

    const texture = await map
        .textureMap!.scaleToFit({
            h: 1024,
            w: 1024,
        })
        .getBase64("image/jpeg", { quality: 70 });
    const metal = await map.metalMap!.getBase64("image/jpeg", { quality: 70 });
    const height = await map.heightMap.getBase64("image/jpeg", { quality: 70 });
    const type = await map.typeMap.getBase64("image/jpeg", { quality: 70 });

    return {
        fileName: path.parse(mapPath).base,
        scriptName: map.scriptName.trim(),
        friendlyName: (map.mapInfo?.name || map.scriptName).trim().replace(/[_-]/g, " "),
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
        images: {
            texture,
            metal,
            height,
            type,
        },
    } as MapData;
};

export function asyncParseMap(mapPath: string) {
    return new Promise<MapData>((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "parse-map-worker.js"), {
            workerData: { mapPath },
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0) reject(new Error(`parse-map-worker stopped with exit code ${code}`));
        });
    });
}
