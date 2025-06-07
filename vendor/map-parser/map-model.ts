// SPDX-FileCopyrightText: 2023 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/map-parser

export type MapInfo = {
    fileName: string;
    springName: string;
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
