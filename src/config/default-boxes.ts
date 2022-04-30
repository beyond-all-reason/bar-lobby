import { StartBox } from "@/model/battle/types";

export const defaultBoxes: Record<string, StartBox[]> = {
    "red_comet_remake_1.8.sd7": [
        { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
        { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 },
    ],
    "quicksilver_remake_1.24.sd7": [
        { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: 0.3 },
        { xPercent: 0, yPercent: 0.75, widthPercent: 1, heightPercent: 0.3 },
    ],
};