// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

//Boxes
export function pointsToXYWH(points: { x: number; y: number }[]) {
    if (points.length !== 2) {
        throw new Error("pointsToXYWH expects exactly 2 points");
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;
    return { x, y, w, h };
}

export function spadsPointsToLTRBPercent(points: { x: number; y: number }[]) {
    if (points.length !== 2) {
        throw new Error("SpadsPointsToLTRBPercent expects exactly 2 points");
    }
    return {
        left: points[0].x / 200,
        top: points[0].y / 200,
        right: points[1].x / 200,
        bottom: points[1].y / 200,
    };
}
