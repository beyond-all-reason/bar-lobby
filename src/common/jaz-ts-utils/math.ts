export function roundToMultiple(num: number, multiple: number) {
    return Number((Math.round(num / multiple) * multiple).toFixed(2));
}

export function clamp(num: number, min: number, max: number) {
    return num <= min ? min : num >= max ? max : num;
}
