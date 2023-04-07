// TODO: add deep readonly type and add a clone method that removes it
export function getBoxes(orientation: DefaultBoxes, percent = 30) {
    const size = percent / 100;
    const sizeInverse = 1.0 - size;
    switch (orientation) {
        case DefaultBoxes.EastVsWest:
            return [
                { xPercent: 0, yPercent: 0, widthPercent: size, heightPercent: 1 },
                { xPercent: sizeInverse, yPercent: 0, widthPercent: size, heightPercent: 1 },
            ];
        case DefaultBoxes.NorthVsSouth:
            return [
                { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: size },
                { xPercent: 0, yPercent: sizeInverse, widthPercent: 1, heightPercent: size },
            ];
        case DefaultBoxes.NortheastVsSouthwest:
            return [
                { xPercent: sizeInverse, yPercent: 0, widthPercent: size, heightPercent: size },
                { xPercent: 0, yPercent: sizeInverse, widthPercent: size, heightPercent: size },
            ];
        case DefaultBoxes.NorthwestVsSouthEast:
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

export enum DefaultBoxes {
    EastVsWest,
    NorthVsSouth,
    NortheastVsSouthwest,
    NorthwestVsSouthEast,
}

export function defaultMapBoxes(mapScriptName?: string) {
    if (!mapScriptName) {
        return getBoxes(DefaultBoxes.NorthVsSouth);
    }

    const mapBoxes = {
        "Red Comet Remake 1.8": getBoxes(DefaultBoxes.EastVsWest),
        "Quicksilver Remake 1.24": getBoxes(DefaultBoxes.NorthVsSouth),
    };

    return mapBoxes[mapScriptName] ?? getBoxes(DefaultBoxes.NorthVsSouth);
}
