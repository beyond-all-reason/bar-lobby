export function randomFromArray<T>(arr: T[]): T | undefined {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function removeFromArray<T>(target: T[], item: T): T[] {
    const index = target.indexOf(item);
    if (index > -1) {
        target.splice(index, 1);
    }
    return target;
}
