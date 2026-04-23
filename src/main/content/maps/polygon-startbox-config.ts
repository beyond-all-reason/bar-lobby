// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";

import { mapContentAPI } from "@main/content/maps/map-content";
import { MAPS_PATHS } from "@main/config/app";
import { evaluateLuaStartBoxScript, LuaValue } from "@main/utils/lua-evaluator";
import { readSpecificFile } from "@main/utils/extract-7z";
import { logger } from "@main/utils/logger";

const log = logger("polygon-startbox-config.ts");

export interface PolygonVertex {
    x: number; // [0, 1] normalized
    y: number; // [0, 1] normalized
}

export interface PolygonStartBoxEntry {
    teamId: number;
    nameLong?: string;
    nameShort?: string;
    polygons: PolygonVertex[][]; // multiple non-contiguous regions per team
    startpoints: PolygonVertex[];
    boundingBox: { left: number; top: number; right: number; bottom: number };
}

export interface PolygonStartBoxConfig {
    entries: PolygonStartBoxEntry[];
}

// Cache: key = "mapName|gameVersion", value = config or null (negative cache)
const configCache = new Map<string, PolygonStartBoxConfig | null>();

function cacheKey(mapName: string, gameVersion: string): string {
    return `${mapName}|${gameVersion}`;
}

export function clearPolygonConfigCache(): void {
    configCache.clear();
}

/** Invalidate cached entries for a specific map (called on map add/delete). */
export function invalidatePolygonConfigForMap(mapName: string): void {
    for (const key of configCache.keys()) {
        if (key.startsWith(`${mapName}|`)) {
            configCache.delete(key);
        }
    }
}

/**
 * Load polygon startbox config for a map from its .sd7 archive.
 *
 * @param mapName - The map's springName (e.g., "Onyx Cauldron 2.2.2")
 * @param gameVersion - The game version string (used for cache keying)
 * @param mapWidthSpringUnits - Map width in Spring map units (multiply by 512 for elmos)
 * @param mapHeightSpringUnits - Map height in Spring map units (multiply by 512 for elmos)
 */
export async function loadPolygonStartBoxConfig(mapName: string, gameVersion: string, mapWidthSpringUnits: number, mapHeightSpringUnits: number): Promise<PolygonStartBoxConfig | null> {
    const key = cacheKey(mapName, gameVersion);

    if (configCache.has(key)) {
        return configCache.get(key) ?? null;
    }

    const mapWidthElmos = mapWidthSpringUnits * 512;
    const mapHeightElmos = mapHeightSpringUnits * 512;

    const config = await tryMapsideConfig(mapName, mapWidthElmos, mapHeightElmos);
    if (config) {
        log.info(`Loaded polygon startbox config for "${mapName}" from map archive`);
    }
    configCache.set(key, config);
    return config;
}

/** Try loading from map .sd7 archive using fengari Lua evaluation. */
async function tryMapsideConfig(mapName: string, mapWidthElmos: number, mapHeightElmos: number): Promise<PolygonStartBoxConfig | null> {
    const sd7Path = findMapSd7Path(mapName);
    if (!sd7Path) {
        log.debug(`No .sd7 file found for map "${mapName}"`);
        return null;
    }

    let luaCode: string;
    try {
        luaCode = await readSpecificFile(sd7Path, "mapconfig/map_startboxes.lua");
    } catch {
        // No startbox config in this map archive — that's normal
        return null;
    }

    if (!luaCode || luaCode.trim().length === 0) {
        return null;
    }

    try {
        const result = evaluateLuaStartBoxScript(luaCode, mapWidthElmos, mapHeightElmos);
        if (!result || typeof result !== "object") {
            log.warn(`Mapside config for "${mapName}" returned non-table result`);
            return null;
        }
        return convertLuaEvalResult(result as Record<string, LuaValue>, mapWidthElmos, mapHeightElmos);
    } catch (err) {
        log.warn(`Failed to evaluate mapside config for "${mapName}": ${err}`);
        return null;
    }
}

/** Find the full .sd7 path for a map by searching MAPS_PATHS. */
function findMapSd7Path(mapName: string): string | null {
    const fileName = mapContentAPI.mapNameFileNameLookup[mapName];
    if (!fileName) return null;

    for (const mapsDir of MAPS_PATHS) {
        const fullPath = path.join(mapsDir, fileName);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}

type LuaTable = { [key: string]: LuaValue };

function isLuaTable(v: LuaValue): v is LuaTable {
    return v !== null && typeof v === "object";
}

/** Get sorted numeric keys from a Lua table (handles both 0-based and 1-based). */
function numericKeysOf(table: LuaTable): number[] {
    return Object.keys(table)
        .map(Number)
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b);
}

/** Safely read a string field from a Lua table, returning undefined if not a string. */
function luaString(table: LuaTable, key: string): string | undefined {
    const v = table[key];
    return typeof v === "string" ? v : undefined;
}

/**
 * Convert fengari Lua evaluation result to PolygonStartBoxConfig.
 * Handles both 0-based ({[0]=..., [1]=...}) and 1-based ({{...}, {...}}) Lua tables.
 * All keys from fengari are strings (e.g., "0", "1", "boxes", "nameLong").
 * Nested arrays are objects with 1-based string keys (e.g., {"1": {...}, "2": {...}}).
 */
function convertLuaEvalResult(parsed: Record<string, LuaValue>, mapWidthElmos: number, mapHeightElmos: number): PolygonStartBoxConfig | null {
    const entries: PolygonStartBoxEntry[] = [];
    const numericKeys = numericKeysOf(parsed);

    if (numericKeys.length === 0) return null;

    // Normalize 1-based (mapside return) to 0-based teamIds
    const baseOffset = numericKeys[0] === 1 ? 1 : 0;

    for (const key of numericKeys) {
        const teamData = parsed[String(key)];
        if (!isLuaTable(teamData)) continue;

        const polygons = extractPolygonsFromLuaObj(teamData.boxes, mapWidthElmos, mapHeightElmos);
        if (polygons.length === 0) continue;

        const startpoints = extractPointsFromLuaObj(teamData.startpoints, mapWidthElmos, mapHeightElmos);

        entries.push({
            teamId: key - baseOffset,
            nameLong: luaString(teamData, "nameLong"),
            nameShort: luaString(teamData, "nameShort"),
            polygons,
            startpoints,
            boundingBox: computeBoundingBox(polygons),
        });
    }

    return entries.length > 0 ? { entries } : null;
}

/** Extract polygon arrays from a fengari Lua table (1-based string keys). */
function extractPolygonsFromLuaObj(boxesValue: LuaValue, mapWidthElmos: number, mapHeightElmos: number): PolygonVertex[][] {
    if (!isLuaTable(boxesValue)) return [];

    const polygons: PolygonVertex[][] = [];

    for (const bk of numericKeysOf(boxesValue)) {
        const box = boxesValue[String(bk)];
        if (!isLuaTable(box)) continue;

        const vertices: PolygonVertex[] = [];
        for (const pk of numericKeysOf(box)) {
            const point = box[String(pk)];
            if (!isLuaTable(point)) continue;
            const x = point["1"];
            const z = point["2"];
            if (typeof x === "number" && typeof z === "number") {
                vertices.push({ x: x / mapWidthElmos, y: z / mapHeightElmos });
            }
        }

        if (vertices.length >= 3) {
            polygons.push(vertices);
        }
    }

    return polygons;
}

/** Extract startpoint coordinates from a fengari Lua table. */
function extractPointsFromLuaObj(pointsValue: LuaValue, mapWidthElmos: number, mapHeightElmos: number): PolygonVertex[] {
    if (!isLuaTable(pointsValue)) return [];

    const points: PolygonVertex[] = [];

    for (const k of numericKeysOf(pointsValue)) {
        const pt = pointsValue[String(k)];
        if (!isLuaTable(pt)) continue;
        const x = pt["1"];
        const z = pt["2"];
        if (typeof x === "number" && typeof z === "number") {
            points.push({ x: x / mapWidthElmos, y: z / mapHeightElmos });
        }
    }

    return points;
}

function computeBoundingBox(polygons: PolygonVertex[][]): { left: number; top: number; right: number; bottom: number } {
    let minX = 1,
        minY = 1,
        maxX = 0,
        maxY = 0;

    for (const poly of polygons) {
        for (const v of poly) {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        }
    }

    return {
        left: Math.max(0, minX),
        top: Math.max(0, minY),
        right: Math.min(1, maxX),
        bottom: Math.min(1, maxY),
    };
}

/** Compute centroid of a polygon for label placement. */
export function polygonCentroid(vertices: PolygonVertex[]): PolygonVertex {
    let cx = 0,
        cy = 0;
    for (const v of vertices) {
        cx += v.x;
        cy += v.y;
    }
    return { x: cx / vertices.length, y: cy / vertices.length };
}
