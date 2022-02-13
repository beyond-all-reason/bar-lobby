import * as path from "path";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { MapData } from "@/model/map-data";

export class MapContentAPI extends AbstractContentAPI {
    protected maps: Readonly<Record<string, MapData>> = {};

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        window.api.workers.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });

        window.api.workers.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });
    }

    public getMaps() : { [filename: string]: MapData; } {
        return this.maps;
    }

    public getMapByFilename(filename: string) : MapData | undefined {
        return this.maps[filename];
    }

    public getMapImages(filename: string) {
        if (this.getMapByFilename(filename)) {
            const filenameWithoutExt = path.parse(filename).name;

            return {
                texture: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-texture.jpg`).replaceAll("\\", "/"),
                height: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-height.jpg`).replaceAll("\\", "/"),
                metal: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-metal.jpg`).replaceAll("\\", "/"),
                type: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-type.jpg`).replaceAll("\\", "/"),
            };
        }

        return;
    }

    public getMapsPath() {
        return path.join(this.dataDir, "maps").replaceAll("\\", "/");
    }

    public getMapImagesPath() {
        return path.join(this.dataDir, "map-images").replaceAll("\\", "/");
    }
}