import { intervalToDuration } from "date-fns";
import fs from "fs";

export function getFriendlyDuration(durationMs: number, withSeconds = true) {
    const durationValues = intervalToDuration({ start: 0, end: durationMs });
    const result = `${durationValues.hours}:${durationValues.minutes?.toString().padStart(2, "0")}`;
    if (withSeconds) {
        return result + `:${durationValues.seconds?.toString().padStart(2, "0")}`;
    }
    return result;
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
