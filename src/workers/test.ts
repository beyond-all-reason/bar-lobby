import { MapParser } from "spring-map-parser";

(async () => {
    // const stuff = await fs.promises.readdir("../");
    // console.log(stuff);

    const mapParser = new MapParser({
        mipmapSize: 8,
        path7za: process.platform === "win32" ? "extra_resources/7za.exe" : "extra_resources/7za"
    });
    const map = await mapParser.parseMap("C:/Users/jaspe/Documents/My Games/Spring/maps/altair_crossing_v3.sd7");
    console.log(map.fileName);
})();