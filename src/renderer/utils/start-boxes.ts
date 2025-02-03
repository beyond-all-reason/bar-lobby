/**
 * Map startbox formats:
 * 1. Map metadata format:
 *    - {
 *        poly: [{ x: number; y: number }, { x: number; y: number }] }[]
 *      }
 *    - x and y are in [0, 200], with (0, 0) at the top left
 *    - Each polygon defines 2 opposite corners of a startbox
 * 2. The start script format:
 *    - {
 *        startrectleft: number;
 *        startrecttop: number;
 *        startrectright: number;
 *        startrectbottom: number;
 *      }
 *    - Values are in [0, 1] as a percentage from the top left
 * 3. The tachyon StartBox format:
 *    - {
 *        top: number;
 *        bottom: number;
 *        left: number;
 *        right: number;
 *      }
 *    - Values are in [0, 1] as a percentage from the top left
 */

import { StartBoxPoly } from "@main/content/maps/map-metadata";
import { StartBoxOrientation } from "@main/game/battle/battle-types";
import type { StartBox } from "tachyon-protocol/types";

export function getBoxes(orientation: StartBoxOrientation, percent = 30): StartBox[] {
    const size = percent / 100;
    const sizeInverse = 1.0 - size;
    switch (orientation) {
        case StartBoxOrientation.EastVsWest:
            return [
                { left: 0, top: 0, right: size, bottom: 1 },
                { left: sizeInverse, top: 0, right: 1, bottom: 1 },
            ];
        case StartBoxOrientation.NorthVsSouth:
            return [
                { left: 0, top: 0, right: 1, bottom: size },
                { left: 0, top: sizeInverse, right: 1, bottom: 1 },
            ];
        case StartBoxOrientation.NortheastVsSouthwest:
            return [
                { left: sizeInverse, top: 0, right: 1, bottom: size },
                { left: 0, top: sizeInverse, right: size, bottom: 1 },
            ];
        case StartBoxOrientation.NorthwestVsSoutheast:
            return [
                { left: 0, top: 0, right: size, bottom: size },
                { left: sizeInverse, top: sizeInverse, right: 1, bottom: 1 },
            ];
    }
}

export function spadsBoxToStartBox(points: StartBoxPoly[]) {
    if (points.length !== 2) {
        throw new Error("spadsBoxToStartBox expects exactly 2 points");
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const x1 = Math.min(...xs);
    const y1 = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);

    const box: StartBox = {
        left: roundToMultiple(x1 / 200, 0.01),
        top: roundToMultiple(y1 / 200, 0.01),
        right: roundToMultiple(x2 / 200, 0.01),
        bottom: roundToMultiple(y2 / 200, 0.01),
    };

    return box;
}

function roundToMultiple(num: number, multiple: number) {
    return Number((Math.round(num / multiple) * multiple).toFixed(2));
}
