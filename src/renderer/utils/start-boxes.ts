// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

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
