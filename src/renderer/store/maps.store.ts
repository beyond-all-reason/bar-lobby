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
    window.maps.onMapCached((mapData: MapData) => {
        console.debug("Received map cached event", mapData);
        db.maps.add(mapData);
    });
    window.maps.onMapDeleted((filename: string) => {
        console.debug("Received map deleted event", filename);
        db.maps.where("fileName").equals(filename).delete();
    });
    await syncMaps();
    mapsStore.isInitialized = true;
}

async function syncMaps() {
    console.debug("Syncing maps");
    // Sync all maps with actual files in map folder
    const allMaps = await db.maps.toArray();
    window.maps.sync(allMaps.map((map) => ({ scriptName: map.scriptName, fileName: map.fileName })));
}
