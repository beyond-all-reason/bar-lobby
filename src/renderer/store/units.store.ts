import { reactive } from "vue";
import { Unit } from "@main/content/game/unit";
import { db } from "@renderer/store/db";

export const unitsStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
});

export async function initUnitsStore() {
    if (unitsStore.isInitialized) return;
    return init();
}

async function init() {
    await parseUnitDataFromGame();
    unitsStore.isInitialized = true;
}

async function parseUnitDataFromGame() {
    console.debug("Parsing unit data");
    const unitLanguage = await window.game.getUnitLanguage("en"); // TODO use i18n locale
    const units = await window.game.getUnits();
    await Promise.allSettled(
        units.map((unit) => {
            // Inject name and description from game language
            const unitName = unitLanguage?.units?.names?.[unit.unitId];
            const unitDescription = unitLanguage?.units?.descriptions?.[unit.unitId];
            const factionName = unitLanguage?.units?.factions?.[unit.factionKey];

            db.units.get(unit.unitId).then((existingUnit) => {
                if (!existingUnit) {
                    return db.units.put({ ...unit, unitName, unitDescription }) as Promise<unknown>;
                } else {
                    return db.units.update(unit.unitId, { ...unit, unitName, unitDescription, factionName }) as Promise<unknown>;
                }
            });
        })
    );
}

export async function fetchMissingUnitImages() {
    const units = await db.units.toArray();
    const missingPreviewImages = units.filter((map) => !map.imageBlobs?.preview);
    const missingPreview3dImages = units.filter((map) => !map.imageBlobs?.preview3d);
    const unitImagesToDownload = missingPreviewImages.length + missingPreview3dImages.length;
    if (unitImagesToDownload > 0) {
        console.debug(`Loading ${missingPreviewImages.length + missingPreview3dImages.length} unit images..`);
        return await Promise.allSettled([...missingPreviewImages.map((unit) => fetchUnitImages(unit, "preview")), ...missingPreview3dImages.map((unit) => fetchUnitImages(unit, "preview3d"))]);
    }
}

async function fetchUnitImages(unit: Unit, imageKey: keyof Unit["images"]) {
    if (unit.imageBlobs?.[imageKey]) return;
    const arrayBuffer = await window.units.fetchUnitImage(unit.images?.[imageKey]);
    await db.units.update(unit.unitId, { imageBlobs: { ...unit.imageBlobs, [imageKey]: new Blob([arrayBuffer], { type: "image/png" }) } });
    console.debug("Updated unit images ", unit.unitId);
}
