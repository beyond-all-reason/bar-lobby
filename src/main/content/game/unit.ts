export type UnitType = "air" | "building" | "sea";

export type Unit = UnitMetadata & {
    fileName: string;
    images?: {
        preview?: string;
        preview3d?: string;
    };
    imageBlobs?: {
        preview?: Blob;
        preview3d?: Blob;
    };
    unitId: string;
    unitName: string;
    unitDescription: string;
    unitCategory: UnitGroup;
    techLevel: TechLevel;
    factionKey: FactionKey;
    factionName: string;
};

// Values parsed from LUA files
export type UnitMetadata = {
    acceleration: number;
    airsightdistance: number;
    buildcostenergy: number;
    buildcostmetal: number;
    buildtime: number;
    canmove: boolean;
    category: string;
    customparams: {
        techlevel: number;
        unitgroup: string;
    };
    icontype: UnitType;
    sightdistance: number;
    maxdamage: number;
    maxvelocity: number;
};

export type UnitLanguage = {
    units: {
        factions: {
            [factionId: string]: string;
        };
        names: {
            [unitId: string]: string;
        };
        descriptions: {
            [unitId: string]: string;
        };
    };
};

export type FactionKey = "arm" | "cor" | "leg" | "chicken" | "random";
export type TechLevel = "T1" | "T2" | "T3";
export type UnitGroup = "bots" | "vehicles" | "air" | "sea" | "hover" | "factories" | "defense" | "buildings";

function getFactionKey(unitId: string): FactionKey {
    if (unitId.startsWith("arm")) return "arm";
    if (unitId.startsWith("cor")) return "cor";
    if (unitId.startsWith("leg")) return "leg";
    if (unitId.startsWith("chicken")) return "chicken";
    return "random";
}
const levelsMap: Record<number, TechLevel> = { 1: "T1", 2: "T2", 3: "T3" };

// TODO: this probably isn't the best option
function getUnitCategory(unit: Unit): UnitGroup {
    const categories = unit.category.split(" ");
    if (categories.includes(categoryNames.MINE)) return "defense";
    if (categories.includes(categoryNames.HOVER)) return "hover";
    if (categories.includes(categoryNames.SHIP)) return "sea";
    if (categories.includes(categoryNames.VTOL)) return "air";
    if (categories.includes(categoryNames.MOBILE) && categories.includes(categoryNames.TANK)) return "vehicles";
    if (categories.includes(categoryNames.MOBILE) && categories.includes(categoryNames.BOT)) return "bots";
    if (categories.includes(categoryNames.SURFACE) && categories.includes(categoryNames.WEAPON)) return "defense";
    if (categories.includes(categoryNames.SURFACE) && categories.includes(categoryNames.NOWEAPON) && unit.customparams.unitgroup === "builder") return "factories";
    return "buildings";
}

export function extendUnitData(unitMetadata: { [unitId: string]: UnitMetadata }): Unit {
    const unitId = Object.keys(unitMetadata)[0];
    const unit = unitMetadata[unitId] as Unit;
    unit.unitId = unitId;

    unit.images = {
        preview: `https://bar-rts.com/unitpics/${unitId}.png`,
        preview3d: `https://bar-rts.com/unitpics3d/${unitId}.png`,
    };

    unit.techLevel = levelsMap[unit.customparams?.techlevel] ?? "T1";

    unit.factionKey = getFactionKey(unit.unitId);

    unit.unitCategory = getUnitCategory(unit);

    return unit;
}

// from alldefs_post.lua
// Deprecated categories: BOT TANK PHIB NOTLAND SPACE
const categoryNames = {
    ALL: "ALL",
    MOBILE: "MOBILE",
    NOTMOBILE: "NOTMOBILE",
    WEAPON: "WEAPON",
    NOWEAPON: "NOWEAPON",
    VTOL: "VTOL", // air
    NOTAIR: "NOTAIR",
    HOVER: "HOVER",
    NOTHOVER: "NOTHOVER",
    SHIP: "SHIP",
    NOTSHIP: "NOTSHIP",
    NOTSUB: "NOTSUB",
    CANBEUW: "CANBEUW", // underwater
    UNDERWATER: "UNDERWATER",
    SURFACE: "SURFACE",
    MINE: "MINE",
    COMMANDER: "COMMANDER",
    EMPABLE: "EMPABLE",

    // deprecated?
    TANK: "TANK",
    BOT: "BOT",
};
