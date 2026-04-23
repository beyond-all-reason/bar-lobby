// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { PolygonStartBoxConfig, PolygonStartBoxEntry, PolygonVertex } from "@main/content/maps/polygon-startbox-config";
import type { StartBox } from "tachyon-protocol/types";

export type { PolygonStartBoxConfig, PolygonStartBoxEntry, PolygonVertex };

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

/** Convert polygon bounding boxes to StartBox array for compatibility. */
export function polygonConfigToStartBoxes(config: PolygonStartBoxConfig): StartBox[] {
    return config.entries.map((entry) => ({
        left: entry.boundingBox.left,
        top: entry.boundingBox.top,
        right: entry.boundingBox.right,
        bottom: entry.boundingBox.bottom,
    }));
}

/** Convert SVG polygon points array to a points attribute string. */
export function polygonPointsToSvg(vertices: PolygonVertex[]): string {
    return vertices.map((v) => `${v.x},${v.y}`).join(" ");
}
