import { intervalToDuration } from "date-fns";

export function getFriendlyDuration(durationMs: number) {
    const durtationValues = intervalToDuration({ start: 0, end: durationMs });
    return `${durtationValues.hours}:${durtationValues.minutes?.toString().padStart(2, "0")}:${durtationValues.seconds?.toString().padStart(2, "0")}`;
}
