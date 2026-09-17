// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData } from "@main/content/maps/map-data";
import { BattleOptions } from "@main/game/battle/battle-types";
import { spadsBoxToStartBox } from "@renderer/utils/start-boxes";
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
        return preset.startboxes.map((box) => spadsBoxToStartBox(box.poly));
    }

    return mapOptions.customStartBoxes ?? eastVsWestStartBoxes();
}
