import { reactive } from "vue";
import type { MapData } from "@main/content/maps/map-data";
import type { GameType, Terrain } from "@main/content/maps/map-metadata";
import { db } from "@renderer/store/db";

export const mapsStore = reactive({
    isInitialized: false,
    filters: {
        terrain: {},
        gameType: {},
        minPlayers: 2,
        maxPlayers: 40,
        favoritesOnly: false,
    },
} as {
    isInitialized: boolean;
    filters: {
        terrain: Partial<Record<Terrain, boolean>>;
        gameType: Partial<Record<GameType, boolean>>;
        minPlayers: number;
        maxPlayers: number;
        favoritesOnly: boolean;
    };
});

export async function getRandomMap(): Promise<MapData> {
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
    window.maps.onMapAdded((filename: string) => {
        console.debug("Received map added event", filename);
        db.maps.where("filename").equals(filename).modify({ isInstalled: true });
    });
    window.maps.onMapDeleted((filename: string) => {
        console.debug("Received map deleted event", filename);
        db.maps.where("filename").equals(filename).modify({ isInstalled: false });
    });
    const maps = await window.maps.fetchAllMaps();
    console.debug("Received all maps", maps);
    await Promise.allSettled(
        maps.map((map) => {
            db.maps.get(map.springName).then((existingMap) => {
                if (!existingMap) {
                    return db.maps.put(map) as Promise<unknown>;
                } else {
                    //TODO this has a limitation. if a field change from defined to undefined it will not be updated.
                    return db.maps.update(map.springName, { ...map }) as Promise<unknown>;
                }
            });
        })
    );
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
    await db.maps.update(map.springName, { imagesBlob: { preview: new Blob([arrayBuffer], { type: "image/webp" }) } });
    console.debug("Updated map images ", map.springName);
}

export async function downloadMap(springName: string) {
    db.maps.update(springName, { isDownloading: true });
    await window.maps
        .downloadMap(springName)
        .then(() => {
            db.maps.update(springName, { isInstalled: true, isDownloading: false });
        })
        .catch((error) => {
            console.error("Failed to download map", error);
            db.maps.update(springName, { isDownloading: false });
        });
}

export function getFilters() {
    return mapsStore.filters;
}
