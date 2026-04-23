// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { gameContentAPI } from "@main/content/game/game-content";
import { parseLuaTable } from "@main/utils/parse-lua-table";
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
// Track which cache entries are negative-cached from available archives vs missing archives
const negativeCacheValid = new Set<string>();

function cacheKey(mapName: string, gameVersion: string): string {
    return `${mapName}|${gameVersion}`;
}

export function clearPolygonConfigCache(): void {
    configCache.clear();
    negativeCacheValid.clear();
}

/**
 * Load polygon startbox config for a map from the game archive.
 * Priority: modside (game archive) config first.
 * Map archive fallback is not implemented (requires .sd7 extraction).
 *
 * @param mapName - The map's springName (e.g., "Cirolata 1.03")
 * @param gameVersion - The game version string
 * @param mapWidthSpringUnits - Map width in Spring map units (multiply by 512 for elmos)
 * @param mapHeightSpringUnits - Map height in Spring map units (multiply by 512 for elmos)
 */
export async function loadPolygonStartBoxConfig(
    mapName: string,
    gameVersion: string,
    mapWidthSpringUnits: number,
    mapHeightSpringUnits: number
): Promise<PolygonStartBoxConfig | null> {
    const key = cacheKey(mapName, gameVersion);

    if (configCache.has(key)) {
        return configCache.get(key) ?? null;
    }

    const mapWidthElmos = mapWidthSpringUnits * 512;
    const mapHeightElmos = mapHeightSpringUnits * 512;

    // Try modside config (game archive): luarules/configs/StartBoxes/<mapName>.lua
    const configPath = `luarules/configs/StartBoxes/${mapName}.lua`;
    try {
        const files = await gameContentAPI.readGameFiles(gameVersion, configPath);
        if (files && files.length > 0) {
            const luaData = files[0].data;
            const parsed = parseLuaTable(luaData);
            const config = convertParsedConfig(parsed, mapWidthElmos, mapHeightElmos);
            if (config) {
                log.info(`Loaded polygon startbox config for "${mapName}" from game archive`);
                configCache.set(key, config);
                negativeCacheValid.add(key);
                return config;
            }
        }
    } catch (err) {
        log.debug(`No polygon config found for "${mapName}" in game archive: ${err}`);
    }

    // No config found — only negative-cache if game version was available
    const gameAvailable = gameContentAPI.isVersionInstalled(gameVersion);
    if (gameAvailable) {
        configCache.set(key, null);
        negativeCacheValid.add(key);
    }

    return null;
}

/**
 * Convert parsed Lua startbox config to PolygonStartBoxConfig.
 * The parsed Lua table has numeric keys (0-based allyTeamIDs) with value objects:
 *   { nameLong, nameShort, startpoints: [[x,z], ...], boxes: [[[x,z], ...], ...] }
 */
function convertParsedConfig(parsed: Record<string, unknown>, mapWidthElmos: number, mapHeightElmos: number): PolygonStartBoxConfig | null {
    const entries: PolygonStartBoxEntry[] = [];

    // Iterate over numeric keys (0, 1, 2, ...)
    const teamIds = Object.keys(parsed)
        .map(Number)
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b);

    if (teamIds.length === 0) return null;

    for (const teamId of teamIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teamData = parsed[teamId] as any;
        if (!teamData || !teamData.boxes) continue;

        const polygons: PolygonVertex[][] = [];
        // boxes is an array of polygons, each polygon is an array of [x, z] pairs
        for (const box of teamData.boxes) {
            if (!Array.isArray(box)) continue;
            const vertices: PolygonVertex[] = [];
            for (const point of box) {
                if (Array.isArray(point) && point.length >= 2) {
                    vertices.push({
                        x: point[0] / mapWidthElmos,
                        y: point[1] / mapHeightElmos,
                    });
                }
            }
            if (vertices.length >= 3) {
                polygons.push(vertices);
            }
        }

        if (polygons.length === 0) continue;

        const startpoints: PolygonVertex[] = [];
        if (teamData.startpoints && Array.isArray(teamData.startpoints)) {
            for (const sp of teamData.startpoints) {
                if (Array.isArray(sp) && sp.length >= 2) {
                    startpoints.push({
                        x: sp[0] / mapWidthElmos,
                        y: sp[1] / mapHeightElmos,
                    });
                }
            }
        }

        const boundingBox = computeBoundingBox(polygons);

        entries.push({
            teamId,
            nameLong: typeof teamData.nameLong === "string" ? teamData.nameLong : teamData.nameLong?.value ?? teamData.nameLong?.raw?.slice(1, -1),
            nameShort: typeof teamData.nameShort === "string" ? teamData.nameShort : teamData.nameShort?.value ?? teamData.nameShort?.raw?.slice(1, -1),
            polygons,
            startpoints,
            boundingBox,
        });
    }

    return entries.length > 0 ? { entries } : null;
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
