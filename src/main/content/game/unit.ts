export type UnitType = "air" | "building" | "sea";

export type Unit = {
    fileName: string;
    imagePath: string;
    unitId: string;
    buildcostenergy: number;
    buildcostmetal: number;
    buildtime: number;
    customparams: {
        techlevel: number;
    };
    icontype: UnitType;
};
