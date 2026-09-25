// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData } from "@main/content/maps/map-data";
import { BattleOptions, StartPosType } from "@main/game/battle/battle-types";
import { customStartboxOverride, hasPolygon, polyToStartBox, StartboxArrangement } from "@shared/startbox-modoptions";
import { StartBox } from "tachyon-protocol/types";

export function eastVsWestStartBoxes(): StartBox[] {
    return [
        { top: 0, bottom: 1, left: 0, right: 0.25 },
        { top: 0, bottom: 1, left: 0.75, right: 1 },
    ];
}

export function getCurrentStartBoxes(map: MapData | undefined, mapOptions: BattleOptions["mapOptions"]): StartBox[] {
    if (mapOptions.startBoxesIndex == undefined) {
        return mapOptions.customStartBoxes ?? [];
    }

    const preset = map?.startboxesSet?.at(mapOptions.startBoxesIndex);
    if (preset) {
        return preset.startboxes.map((box) => polyToStartBox(box.poly));
    }

    return mapOptions.customStartBoxes ?? eastVsWestStartBoxes();
}

export function getCurrentArrangement(map: MapData | undefined, mapOptions: BattleOptions["mapOptions"]): StartboxArrangement | undefined {
    if (mapOptions.startBoxesIndex != undefined) {
        return map?.startboxesSet?.at(mapOptions.startBoxesIndex);
    }

    const arrangement = customStartboxOverride(mapOptions.customStartBoxes, mapOptions.customStartBoxShapes);

    return arrangement && hasPolygon(arrangement) ? arrangement : undefined;
}

export function withStartboxOverride(mapOptions: BattleOptions["mapOptions"], override: StartboxArrangement): BattleOptions["mapOptions"] {
    return {
        ...mapOptions,
        startPosType: StartPosType.Boxes,
        startBoxesIndex: undefined,
        customStartBoxes: override.startboxes.map((box) => polyToStartBox(box.poly)),
        customStartBoxShapes: override.startboxes.map((box) => box.poly.map((point) => ({ ...point }))),
    };
}

export function getStartboxOverride(mapOptions: BattleOptions["mapOptions"]): StartboxArrangement | undefined {
    if (mapOptions.startBoxesIndex != undefined) return undefined;

    return customStartboxOverride(mapOptions.customStartBoxes, mapOptions.customStartBoxShapes);
}
