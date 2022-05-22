import { StartBox } from "@/model/battle/types";

export const defaultBoxes = () => {
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
};

export const defaultMapBoxes: () => Record<string, StartBox[]> = () => {
    return {
        "red_comet_remake_1.8.sd7": defaultBoxes().EastVsWest,
        "quicksilver_remake_1.24.sd7": defaultBoxes().NorthVsSouth,
    };
};
