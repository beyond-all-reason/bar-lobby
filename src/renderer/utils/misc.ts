import { intervalToDuration } from "date-fns";
import fs from "fs";

export function getFriendlyDuration(durationMs: number) {
    const durtationValues = intervalToDuration({ start: 0, end: durationMs });
    return `${durtationValues.hours}:${durtationValues.minutes?.toString().padStart(2, "0")}:${durtationValues.seconds?.toString().padStart(2, "0")}`;
}

export async function isFileInUse(filePath: string): Promise<boolean> {
    try {
        const file = await fs.promises.open(filePath, fs.constants.O_RDONLY | 0x10000000);
        await file.close();
        return false;
    } catch (err) {
        return true;
    }
}
