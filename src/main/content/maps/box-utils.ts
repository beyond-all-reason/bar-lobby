// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Accepts either:
//   - 2 points (legacy axis-aligned rectangle: top-left + bottom-right)
//   - 3+ points (closed polygon ring; bounding box is computed)
// The polygon-shape itself is preserved upstream of this helper and rendered
// as an SVG overlay; rect-only consumers (engine start script, Tachyon
// protocol, lobby drag-edit) operate on the bounding-box rectangle.
export function spadsPointsToLTRBPercent(points: { x: number; y: number }[]) {
    if (points.length < 2) {
        throw new Error("SpadsPointsToLTRBPercent needs at least 2 points");
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
        left: Math.min(...xs) / 200,
        top: Math.min(...ys) / 200,
        right: Math.max(...xs) / 200,
        bottom: Math.max(...ys) / 200,
    };
}
