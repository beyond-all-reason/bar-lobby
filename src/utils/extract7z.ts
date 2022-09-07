import { extractFull } from "node-7z";
import * as path from "path";

// binaries taken from https://github.com/develar/7zip-bin

export function extract7z(archivePath: string, outputName: string) {
    return new Promise<void>((resolve, reject) => {
        const archivePathObj = path.parse(archivePath);
        const outputPath = path.join(archivePathObj.dir, outputName);

        const binaryName = process.platform === "win32" ? "7za.exe" : "7za";

        const stream = extractFull(archivePath, outputPath, {
            $bin: path.join(api.info.resourcesPath, binaryName),
        });

        stream.on("error", reject);
        stream.on("end", resolve);
    });
}
