// TODO: add deep readonly type and add a clone method that removes it
export function defaultBoxes() {
    return {
        EastVsWest: [
            { xPercent: 0, yPercent: 0, widthPercent: 0.3, heightPercent: 1 },
            { xPercent: 0.7, yPercent: 0, widthPercent: 0.3, heightPercent: 1 },
        ],
        NorthVsSouth: [
            { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: 0.3 },
            { xPercent: 0, yPercent: 0.7, widthPercent: 1, heightPercent: 0.3 },
        ],
        NortheastVsSouthwest: [
            { xPercent: 0.7, yPercent: 0, widthPercent: 0.3, heightPercent: 0.3 },
            { xPercent: 0, yPercent: 0.7, widthPercent: 0.3, heightPercent: 0.3 },
        ],
        NorthwestVsSouthEast: [
            { xPercent: 0, yPercent: 0, widthPercent: 0.3, heightPercent: 0.3 },
            { xPercent: 0.7, yPercent: 0.7, widthPercent: 0.3, heightPercent: 0.3 },
        ],
    };
}

export function defaultMapBoxes(mapScriptName?: string) {
    if (!mapScriptName) {
        return defaultBoxes().NorthVsSouth;
    }

    const mapBoxes = {
        "Red Comet Remake 1.8": defaultBoxes().EastVsWest,
        "Quicksilver Remake 1.24": defaultBoxes().NorthVsSouth,
    };

    return mapBoxes[mapScriptName] ?? defaultBoxes().NorthVsSouth;
}
