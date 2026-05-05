// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * Catmull-Rom spline tessellation for startbox anchor rings.
 *
 * 1:1 port of:
 *   - bar-game/common/lib_spline.lua (game-side tessellator)
 *   - bar-chobby/LuaMenu/configs/gameConfig/byar/lib_spline.lua (Chobby preview)
 *   - rowy/src/components/MapStartbox.tsx (editor preview)
 *
 * Identical inputs produce vertex-identical output across all four consumers,
 * so the lobby preview, the Chobby preview, and the in-game render of the same
 * startbox can never visually disagree.
 */

export interface AnchorPoint {
    x: number;
    y: number;
    /** Optional strength in [0, 1]. 0 (or omitted) is a sharp polygon corner. */
    strength?: number;
}

export interface TessellatedPoint {
    x: number;
    y: number;
}

const DEFAULT_SEGMENTS = 12;

function clamp01(v: number): number {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

/**
 * Sample a Catmull-Rom curve segment between p1 and p2 (with neighbours p0, p3),
 * blended toward the linear interpolation by `tension` in [0, 1].
 * tension == 0 returns the exact linear interpolation between p1 and p2.
 * tension == 1 returns the full uniform Catmull-Rom sample.
 * Anchor points lie on the curve regardless of tension because at t=0 and t=1
 * both linear and Catmull-Rom outputs coincide with p1 and p2.
 */
function sampleSegment(p0: AnchorPoint, p1: AnchorPoint, p2: AnchorPoint, p3: AnchorPoint, t: number, tension: number): TessellatedPoint {
    const lx = p1.x + (p2.x - p1.x) * t;
    const ly = p1.y + (p2.y - p1.y) * t;
    if (tension <= 0) return { x: lx, y: ly };

    const t2 = t * t;
    const t3 = t2 * t;
    const crX = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
    const crY = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    if (tension >= 1) return { x: crX, y: crY };
    return {
        x: lx + (crX - lx) * tension,
        y: ly + (crY - ly) * tension,
    };
}

/**
 * Tessellate a closed ring of anchor points into a dense polygon. Anchors
 * without explicit strength are treated as sharp corners (strength 0); plain
 * polygons emerge with vertex-identical output (no extra vertices added).
 *
 * @param anchors closed ring of anchor points (at least 2)
 * @param segments subdivisions per curved edge (default 12). Production
 *   callers can omit this and accept the default; tests can supply a smaller
 *   value to keep generated data compact.
 */
export function tessellateRing(anchors: AnchorPoint[], segments = DEFAULT_SEGMENTS): TessellatedPoint[] {
    const n = anchors.length;
    if (n < 2) return anchors.map((p) => ({ x: p.x, y: p.y }));
    const seg = Math.max(1, segments);

    const out: TessellatedPoint[] = [];
    for (let i = 0; i < n; i++) {
        const iPrev = (i - 1 + n) % n;
        const iNext = (i + 1) % n;
        const iNext2 = (iNext + 1) % n;
        const p0 = anchors[iPrev];
        const p1 = anchors[i];
        const p2 = anchors[iNext];
        const p3 = anchors[iNext2];

        const s1 = clamp01(p1.strength ?? 0);
        const s2 = clamp01(p2.strength ?? 0);
        const edgeTension = clamp01((s1 + s2) * 0.5);

        out.push({ x: p1.x, y: p1.y });
        if (edgeTension > 0 && n >= 3) {
            for (let k = 1; k < seg; k++) {
                out.push(sampleSegment(p0, p1, p2, p3, k / seg, edgeTension));
            }
        }
    }
    return out;
}

/**
 * Decide whether a poly should be drawn as a polygon outline (3+ points) or
 * left to the existing rectangle renderer (2 points). Used by the lobby
 * preview to branch between the rect-div and the SVG polygon overlay.
 */
export function isPolygonShape(poly: { x: number; y: number }[]): boolean {
    return poly.length > 2;
}
