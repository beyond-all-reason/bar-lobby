export async function loadFont(url: string) {
    const parts = url.split("/");
    const family = parts[1];
    const fileName = parts[2];
    const [weight, style] = fileName.split(".")[0].split("-");
    const buildFontPath = require(`@/assets/fonts/${family}/${fileName}`);
    const font = new FontFace(family, `url(${buildFontPath})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}