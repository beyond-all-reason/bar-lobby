import { reactive } from "vue";
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";

export const mapsStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
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
        db.maps.where("fileName").equals(filename).modify({ isInstalled: true });
    });
    window.maps.onMapDeleted((filename: string) => {
        console.debug("Received map deleted event", filename);
        db.maps.where("fileName").equals(filename).modify({ isInstalled: false });
    });
    const maps = await window.maps.fetchAllMaps();
    console.debug("Received all maps", maps);
    await Promise.allSettled(
        maps.map((map) => {
            db.maps.get(map.springName).then((existingMap) => {
                if (!existingMap) {
                    return db.maps.put(map) as Promise<unknown>;
                } else {
                    return db.maps.update(map.springName, { ...map }) as Promise<unknown>;
                }
            });
        })
    );
    mapsStore.isInitialized = true;
}

export async function fetchMapImages(map: MapData) {
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
