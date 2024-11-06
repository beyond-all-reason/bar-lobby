// TODO: add deep readonly type and add a clone method that removes it
import { StartBox } from "@main/game/battle/battle-types";

export function getBoxes(orientation: StartBoxOrientation, percent = 30) {
    const size = percent / 100;
    const sizeInverse = 1.0 - size;
    switch (orientation) {
        case StartBoxOrientation.EastVsWest:
            return [
                { xPercent: 0, yPercent: 0, widthPercent: size, heightPercent: 1 },
                { xPercent: sizeInverse, yPercent: 0, widthPercent: size, heightPercent: 1 },
            ];
        case StartBoxOrientation.NorthVsSouth:
            return [
                { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: size },
                { xPercent: 0, yPercent: sizeInverse, widthPercent: 1, heightPercent: size },
            ];
        case StartBoxOrientation.NortheastVsSouthwest:
            return [
                { xPercent: sizeInverse, yPercent: 0, widthPercent: size, heightPercent: size },
                { xPercent: 0, yPercent: sizeInverse, widthPercent: size, heightPercent: size },
            ];
        case StartBoxOrientation.NorthwestVsSouthEast:
            return [
                { xPercent: 0, yPercent: 0, widthPercent: size, heightPercent: size },
                {
                    xPercent: sizeInverse,
                    yPercent: sizeInverse,
                    widthPercent: size,
                    heightPercent: size,
                },
            ];
    }
}

export enum StartBoxOrientation {
    EastVsWest = "EastVsWeast",
    NorthVsSouth = "NorthVsSouth",
    NortheastVsSouthwest = "NortheastVsSouthwest",
    NorthwestVsSouthEast = "NorthwestVsSouthEast",
}

export function defaultMapBoxes(mapspringName?: "Red Comet Remake 1.8" | "Quicksilver Remake 1.24") {
    if (!mapspringName) {
        return getBoxes(StartBoxOrientation.EastVsWest);
    }
    const mapBoxes = {
        "Red Comet Remake 1.8": getBoxes(StartBoxOrientation.EastVsWest),
        "Quicksilver Remake 1.24": getBoxes(StartBoxOrientation.NorthVsSouth),
    };
    return mapBoxes[mapspringName] ?? getBoxes(StartBoxOrientation.EastVsWest);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spadsBoxToStartBox(spadsBox: any) {
    const box: StartBox = {
        xPercent: roundToMultiple(spadsBox.x1 / 200, 0.01),
        yPercent: roundToMultiple(spadsBox.y1 / 200, 0.01),
        widthPercent: roundToMultiple(spadsBox.x2 / 200 - spadsBox.x1 / 200, 0.01),
        heightPercent: roundToMultiple(spadsBox.y2 / 200 - spadsBox.y1 / 200, 0.01),
    };
    return box;
}

function roundToMultiple(num: number, multiple: number) {
    return Number((Math.round(num / multiple) * multiple).toFixed(2));
}
