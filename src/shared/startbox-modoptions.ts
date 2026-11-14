// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { StartBox } from "tachyon-protocol/types";

// Game-side contract: Beyond-All-Reason luarules/gadgets/include/startbox_utilities.lua.
export const STARTBOXES_SET_KEY = "mapmetadata_startboxes_set";
export const STARTBOX_OVERRIDE_KEY = "mapmetadata_startbox_override";

export interface StartboxPoint {
    x: number;
    y: number;
    strength?: number;
}

export interface StartboxArrangement {
    startboxes: { poly: StartboxPoint[] }[];
    maxPlayersPerStartbox?: number;
}

export type StartboxesSet = Record<string, StartboxArrangement>;

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
    const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));

    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function runThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
    const writer = stream.writable.getWriter();
    // A bad input rejects these too, but the reader below reports it; this only stops a duplicate unhandled rejection.
    writer.write(bytes).catch(() => {});
    writer.close().catch(() => {});

    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();
    for (let result = await reader.read(); !result.done; result = await reader.read()) {
        chunks.push(result.value);
    }

    const out = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }

    return out;
}

function parseJsonObject(bytes: Uint8Array | undefined): unknown {
    if (!bytes) return undefined;

    try {
        const parsed = JSON.parse(new TextDecoder().decode(bytes));

        return typeof parsed === "object" && parsed !== null ? parsed : undefined;
    } catch {
        return undefined;
    }
}

// base64url(zlib(json)) with the '=' padding stripped, which the modoption value pattern forbids.
export async function encodeModoptionValue(value: unknown): Promise<string> {
    const json = new TextEncoder().encode(JSON.stringify(value));

    return toBase64Url(await runThrough(json, new CompressionStream("deflate")));
}

// Mirrors the game's decoder, which also takes a payload that was never compressed.
export async function decodeModoptionValue(raw: string | undefined): Promise<unknown> {
    if (!raw) return undefined;

    let bytes: Uint8Array;
    try {
        bytes = fromBase64Url(raw);
    } catch {
        return undefined;
    }

    const inflated = await runThrough(bytes, new DecompressionStream("deflate")).catch(() => undefined);

    return parseJsonObject(inflated) ?? parseJsonObject(bytes);
}

function isPoint(value: unknown): value is StartboxPoint {
    if (typeof value !== "object" || value === null) return false;
    const { x, y, strength } = value as Record<string, unknown>;

    return typeof x === "number" && typeof y === "number" && (strength === undefined || typeof strength === "number");
}

export function isArrangement(value: unknown): value is StartboxArrangement {
    if (typeof value !== "object" || value === null) return false;
    const { startboxes } = value as Record<string, unknown>;
    if (!Array.isArray(startboxes)) return false;

    return startboxes.every((box) => Array.isArray(box?.poly) && box.poly.length >= 2 && box.poly.every(isPoint));
}

export function isStartboxesSet(value: unknown): value is StartboxesSet {
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isArrangement);
}

// maps-metadata guarantees one arrangement per team count, so none collide.
export function startboxesSetByTeamCount(arrangements: StartboxArrangement[]): StartboxesSet {
    return Object.fromEntries(arrangements.map((arrangement) => [String(arrangement.startboxes.length), arrangement]));
}

// Same order as the game's resolveArrangement; undefined means the game uses the engine rects.
export function resolveArrangement(override: StartboxArrangement | undefined, set: StartboxesSet | undefined, numTeams: number) {
    if (override && override.startboxes.length >= numTeams) return override;
    if (!set) return undefined;
    if (set[String(numTeams)]) return set[String(numTeams)];

    const keys = Object.keys(set).filter((key) => Number.isFinite(Number(key)));
    const larger = keys.filter((key) => Number(key) > numTeams).sort((a, b) => Number(a) - Number(b))[0];
    if (larger) return set[larger];

    const smaller = keys.filter((key) => Number(key) < numTeams).sort((a, b) => Number(b) - Number(a))[0];

    return smaller ? set[smaller] : undefined;
}

// 0-200 grid, (0, 0) top left. A 2-point poly is two opposite corners.
export function polyToStartBox(poly: StartboxPoint[]): StartBox {
    const xs = poly.map((point) => point.x);
    const ys = poly.map((point) => point.y);

    return {
        left: roundToMultiple(Math.min(...xs) / 200, 0.01),
        top: roundToMultiple(Math.min(...ys) / 200, 0.01),
        right: roundToMultiple(Math.max(...xs) / 200, 0.01),
        bottom: roundToMultiple(Math.max(...ys) / 200, 0.01),
    };
}

function roundToMultiple(num: number, multiple: number) {
    return Number((Math.round(num / multiple) * multiple).toFixed(2));
}

export function rectsToArrangement(boxes: StartBox[]): StartboxArrangement {
    return {
        startboxes: boxes.map((box) => ({
            poly: [
                { x: Math.round(box.left * 200), y: Math.round(box.top * 200) },
                { x: Math.round(box.right * 200), y: Math.round(box.bottom * 200) },
            ],
        })),
    };
}

export function hasPolygon(arrangement: StartboxArrangement) {
    return arrangement.startboxes.some((box) => box.poly.length > 2);
}

function isBoundedBy(shape: StartboxPoint[], box: StartBox) {
    const bounds = polyToStartBox(shape);

    return bounds.left === box.left && bounds.top === box.top && bounds.right === box.right && bounds.bottom === box.bottom;
}

// The rect editor doesn't know about shapes, so a shape only counts while its rect still bounds it.
export function customStartboxOverride(customStartBoxes: StartBox[] | undefined, shapes: StartboxPoint[][] | undefined): StartboxArrangement | undefined {
    if (!customStartBoxes?.length) return undefined;

    const rects = rectsToArrangement(customStartBoxes).startboxes;

    return {
        startboxes: customStartBoxes.map((box, index) => {
            const shape = shapes?.[index];

            return shape && isBoundedBy(shape, box) ? { poly: shape } : rects[index];
        }),
    };
}

// The game's start position tool copies "!bSet mapmetadata_startbox_override <value>".
export function parseStartboxOverrideInput(input: string) {
    const trimmed = input.trim();
    const command = trimmed.match(/^!bset\s+(\S+)\s+(\S+)$/i);
    if (!command) return trimmed;

    return command[1].toLowerCase() === STARTBOX_OVERRIDE_KEY ? command[2] : undefined;
}
