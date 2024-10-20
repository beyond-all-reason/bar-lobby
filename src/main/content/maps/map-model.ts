import { DeepPartial, Optionals } from "$/jaz-ts-utils/types";
import { JimpInstance } from "jimp";

export type SpringMap = {
    fileName: string;
    fileNameWithExt: string;
    scriptName: string;
    minHeight: number;
    maxHeight: number;
    mapInfo?: DeepPartial<MapInfo>;
    smd?: SMD;
    smf?: SMF;
    textureMap?: JimpInstance;
    heightMap: JimpInstance;
    miniMap: JimpInstance;
    metalMap: JimpInstance;
    typeMap: JimpInstance;
    resources?: Record<string, JimpInstance | undefined>;
};

export type SMD = {
    description: string;
    tidalStrength: number;
    gravity: number;
    maxMetal: number;
    extractorRadius: number;
    mapHardness: number;
    minWind: number;
    maxWind: number;
    minHeight?: number;
    maxHeight?: number;
    startPositions: Array<{ x: number; z: number }>;
};

export type SMF = {
    magic: string;
    version: number;
    id: number;
    mapWidth: number;
    mapWidthUnits: number;
    mapHeight: number;
    mapHeightUnits: number;
    squareSize: number;
    texelsPerSquare: number;
    tileSize: number;
    minDepth: number;
    maxDepth: number;
    heightMapIndex: number;
    typeMapIndex: number;
    tileIndexMapIndex: number;
    miniMapIndex: number;
    metalMapIndex: number;
    featureMapIndex: number;
    noOfExtraHeaders: number;
    extraHeaders: Array<SMFExtraHeader>;
    numOfTileFiles: number;
    numOfTilesInAllFiles: number;
    numOfTilesInThisFile: number;
    smtFileName: string;
    heightMap: JimpInstance;
    typeMap: JimpInstance;
    miniMap: JimpInstance;
    metalMap: JimpInstance;
    tileIndexMap: number[];
    features: any; // TODO
    heightMapValues: number[];
};

export type SMFExtraHeader = {
    size: number;
    type: number;
    data: Buffer;
};

export type WaterOptions = {
    textureMap: JimpInstance;
    heightMapValues: number[];
    minHeight: number;
    maxHeight: number;

    rgbColor?: { r: number; g: number; b: number };
    rgbModifier?: { r: number; g: number; b: number };
};

export type MapInfo = {
    fileName: string;
    scriptName: string;
    name: string;
    shortname: string;
    description: string;
    author: string;
    version: string;
    mapfile: string;
    modtype: number;
    depend: any;
    replace: any;
    maphardness: number;
    notDeformable: boolean;
    gravity: number;
    tidalStrength: number;
    maxMetal: number;
    extractorRadius: number;
    voidGround: boolean;
    voidWater: boolean;
    autoShowMetal: boolean;
    smf: Smf;
    sound: Sound;
    resources: { [key: string]: string };
    splats: Splats;
    atmosphere: Atmosphere;
    grass: Grass;
    lighting: Lighting;
    water: Water;
    teams: Team[];
    terrainTypes: TerrainType[];
    custom: Custom;
    mapWidthUnits: number;
    mapHeightUnits: number;
    minDepth: number;
    maxDepth: number;
    smtFileName: string;
};

export type Smf = {
    minheight: number;
    maxheight: number;
    smtFileName0: string;
};

export type Passfilter = {
    gainlf: number;
    gainhf: number;
};

export type Sound = {
    preset: string;
    passfilter: Passfilter;
    reverb: any;
};

export type Splats = {
    TexScales: number[];
    TexMults: number[];
};

export type Atmosphere = {
    minWind: number;
    maxWind: number;
    fogEnd: number;
    fogStart: number;
    skyBox: string;
    cloudColor: number[];
    fogColor: number[];
    skyColor: number[];
    sunColor: number[];
    skyDir: number[];
    cloudDensity: number;
};

export type Grass = {
    bladeWaveScale: number;
    bladeWidth: number;
    bladeHeight: number;
    bladeAngle: number;
    bladeColor: number[];
};

export type Lighting = {
    groundShadowDensity: number;
    unitShadowDensity: number;
    groundAmbientColor: number[];
    groundDiffuseColor: number[];
    groundSpecularColor: number[];
    sunDir: number[];
    unitAmbientColor: number[];
    unitDiffuseColor: number[];
    unitSpecularColor: number[];
    groundambientcolor: number[];
    grounddiffusecolor: number[];
    groudspecularcolor: number[];
    groundshadowdensity: number;
    unitshadowdensity: number;
    specularsuncolor: number[];
    specularExponent: number;
};

export type Water = {
    ambientFactor: number;
    blurBase: number;
    blurExponent: number;
    diffuseFactor: number;
    foamTexture: string;
    forceRendering: boolean;
    fresnelMax: number;
    fresnelMin: number;
    fresnelPower: number;
    hasWaterPlane: boolean;
    normalTexture: string;
    numTiles: number;
    perlinAmplitude: number;
    perlinLacunarity: number;
    perlinStartFreq: number;
    reflectionDistortion: number;
    repeatX: number;
    repeatY: number;
    shoreWaves: boolean;
    specularFactor: number;
    specularPower: number;
    texture: string;
    diffuseColor: number[];
    planeColor: number[];
    specularColor: number[];
    damage: number;
    absorb: number[];
    basecolor: number[];
    mincolor: number[];
    surfacecolor: number[];
    surfaceAlpha: number;
    windSpeed: number;
};

export type StartPos = {
    x: number;
    z: number;
};

export type Team = {
    startPos: StartPos;
};

export type MoveSpeeds = {
    tank: number;
    kbot: number;
    hover: number;
    ship: number;
};

export type TerrainType = {
    name: string;
    hardness: number;
    receiveTracks: boolean;
    moveSpeeds: MoveSpeeds;
};

export type Fog = {
    color: number[];
    height: string;
    fogatten: number;
};

export type Precipitation = {
    density: number;
    size: number;
    speed: number;
    windscale: number;
    texture: string;
};

export type Custom = {
    fog: Fog;
    precipitation: Precipitation;
};

export const defaultWaterOptions: Optionals<WaterOptions> = {
    rgbColor: { r: 33, g: 35, b: 77 },
    rgbModifier: { r: 1, g: 1.2, b: 1 },
};
