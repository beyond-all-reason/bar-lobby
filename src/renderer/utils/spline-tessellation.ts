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

/** Centripetal knot spacing: |delta|^0.5 (alpha = 0.5). */
function knotDelta(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.pow(dx * dx + dy * dy, 0.25);
}

/** Barry-Goldman lerp of a->b over knot span [ta, tb], evaluated at tt. */
function bgLerp(tt: number, a: { x: number; y: number }, b: { x: number; y: number }, ta: number, tb: number): { x: number; y: number } {
    const w = (tb - tt) / (tb - ta);
    return { x: w * a.x + (1 - w) * b.x, y: w * a.y + (1 - w) * b.y };
}

/**
 * Sample a centripetal Catmull-Rom curve segment between p1 and p2 (neighbours
 * p0, p3), blended toward the straight chord by `tension` in [0, 1].
 * Centripetal parameterization (alpha = 0.5) avoids the cusps/self-intersections
 * (the "curly-q" overshoot) that uniform Catmull-Rom produces at sharp corners.
 * tension == 0 returns the exact linear interpolation; tension == 1 the full
 * centripetal sample. Anchors lie on the curve (t=0 -> p1, t=1 -> p2).
 */
function sampleSegment(p0: AnchorPoint, p1: AnchorPoint, p2: AnchorPoint, p3: AnchorPoint, t: number, tension: number): TessellatedPoint {
    const lx = p1.x + (p2.x - p1.x) * t;
    const ly = p1.y + (p2.y - p1.y) * t;
    if (tension <= 0) return { x: lx, y: ly };

    const t0 = 0;
    const t1 = t0 + knotDelta(p0, p1);
    const t2 = t1 + knotDelta(p1, p2);
    const t3 = t2 + knotDelta(p2, p3);

    let crX: number;
    let crY: number;
    if (t2 - t1 <= 1e-9) {
        crX = p1.x;
        crY = p1.y;
    } else {
        const tt = t1 + (t2 - t1) * t;
        const A1 = t1 - t0 > 1e-9 ? bgLerp(tt, p0, p1, t0, t1) : { x: p1.x, y: p1.y };
        const A2 = bgLerp(tt, p1, p2, t1, t2);
        const A3 = t3 - t2 > 1e-9 ? bgLerp(tt, p2, p3, t2, t3) : { x: p2.x, y: p2.y };
        const B1 = bgLerp(tt, A1, A2, t0, t2);
        const B2 = bgLerp(tt, A2, A3, t1, t3);
        const C = bgLerp(tt, B1, B2, t1, t2);
        crX = C.x;
        crY = C.y;
    }

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
