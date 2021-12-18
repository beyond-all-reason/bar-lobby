export function loadImage(url: string) {
    return new Promise<string>((resolve, reject) => {
        const fileName = url.slice(2);
        const buildImagePath = require(`@/assets/images/${fileName}`);
        const image = new Image();
        image.onload = () => {
            resolve(buildImagePath);
        };
        image.onerror = () => {
            reject(`Failed to load image ${url}`);
        };
        image.src = buildImagePath;
    });
}