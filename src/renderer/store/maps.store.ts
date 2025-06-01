import { reactive } from "vue";
import type { MapData, MapDownloadData } from "@main/content/maps/map-data";
import type { GameType, Terrain } from "@main/content/maps/map-metadata";
import { db } from "@renderer/store/db";
import { EntityTable } from "dexie";

export const mapsStore: {
    isInitialized: boolean;
    filters: {
        terrain: Partial<Record<Terrain, boolean>>;
        gameType: Partial<Record<GameType, boolean>>;
        minPlayers: number;
        maxPlayers: number;
        favoritesOnly: boolean;
    };
} = reactive({
    isInitialized: false,
    filters: {
        terrain: {},
        gameType: {},
        minPlayers: 2,
        maxPlayers: 40,
        favoritesOnly: false,
    },
});

export async function getRandomMap() {
    const mapCount = await db.maps.count();
    if (mapCount === 0) throw new Error("No maps available");
    const randomIndex = Math.floor(Math.random() * mapCount);
    const map = await db.maps.offset(randomIndex).first();
    return map;
}

export async function initMapsStore() {
    if (mapsStore.isInitialized) return;
    return init();
}

async function init() {
    window.maps.onMapAdded((springName: string) => {
        console.debug("Received map added event", springName);
        db.maps.where("springName").equals(springName).modify({ isInstalled: true });
        db.nonLiveMaps.where("springName").equals(springName).modify({ isInstalled: true });
    });
    window.maps.onMapDeleted((springName: string) => {
        console.debug("Received map deleted event", springName);
        db.maps.where("springName").equals(springName).modify({ isInstalled: false });
        db.nonLiveMaps.where("springName").equals(springName).modify({ isInstalled: false });
    });

    const [liveMaps, nonLiveMaps] = await window.maps.fetchAllMaps();

    console.debug("Received maps", [liveMaps, nonLiveMaps]);

    await Promise.allSettled(
        liveMaps
            .map((map) => {
                db.maps.get(map.springName).then((existingMap) => {
                    if (!existingMap) {
                        return db.maps.put(map) as Promise<unknown>;
                    } else {
                        //TODO this has a limitation. if a field change from defined to undefined it will not be updated.
                        return db.maps.update(map.springName, { ...map, isDownloading: false }) as Promise<unknown>;
                    }
                });
            })
            .concat(
                nonLiveMaps.map((map) => {
                    db.nonLiveMaps.get(map.springName).then((existingMap) => {
                        if (!existingMap) {
                            return db.nonLiveMaps.put(map) as Promise<unknown>;
                        } else {
                            return db.nonLiveMaps.update(map.springName, { ...map, isDownloading: false }) as Promise<unknown>;
                        }
                    });
                })
            )
    );

    // Refresh the nonLiveMaps
    const nonLiveMapSet = new Set(nonLiveMaps.map((map) => map.springName));

    (await db.nonLiveMaps.toArray())
        .filter((map) => !nonLiveMapSet.has(map.springName))
        .forEach((map) => {
            db.nonLiveMaps.update(map.springName, { ...map, isInstalled: false });
        });

    mapsStore.isInitialized = true;
}

//TODO We need to support updating map images when reference in map metadata changes.
export async function fetchMissingMapImages() {
    const maps = await db.maps.toArray();
    const missingImages = maps.filter((map) => !map.imagesBlob?.preview);
    return await Promise.allSettled(missingImages.map(fetchMapImages));
}

async function fetchMapImages(map: MapData) {
    if (map.imagesBlob?.preview) return;
    const arrayBuffer = await window.maps.fetchMapImages(map.images?.preview);
    if (!arrayBuffer) {
        console.error("Failed to fetch map images", map.springName);
        return;
    }
    await db.maps.update(map.springName, { imagesBlob: { preview: new Blob([arrayBuffer], { type: "image/webp" }) } });
    console.debug("Updated map images ", map.springName);
}

export async function downloadMap(springName: string) {
    let dbDelegate: EntityTable<MapData, "springName"> | EntityTable<MapDownloadData, "springName"> = db.maps;

    const mapIsLive = await db.maps.get(springName);

    if (!mapIsLive) {
        dbDelegate = db.nonLiveMaps;
        const isInNonLiveDB = await db.nonLiveMaps.get(springName);
        if (!isInNonLiveDB) {
            db.nonLiveMaps.put({
                springName: springName,
                isDownloading: false,
                isInstalled: false,
            } satisfies MapDownloadData);
        }
    }

    dbDelegate.update(springName, { isDownloading: true });
    await window.maps
        .downloadMap(springName)
        .then(() => {
            dbDelegate.update(springName, { isInstalled: true, isDownloading: false });
        })
        .catch((error) => {
            console.error("Failed to download map", error);
            dbDelegate.update(springName, { isDownloading: false });
        });
}

export function getFilters() {
    return mapsStore.filters;
}
