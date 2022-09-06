import { extractFull } from "node-7z";
import * as path from "path";

// binaries taken from https://github.com/develar/7zip-bin

export function extract7z(archivePath: string, outputName: string) {
    return new Promise<void>((resolve, reject) => {
        const archivePathObj = path.parse(archivePath);
        const outputPath = path.join(archivePathObj.dir, outputName);

        let binaryPath = process.platform === "win32" ? "resources/7za.exe" : "resources/7za";
        if (process.env.NODE_ENV !== "development") {
            binaryPath = process.platform === "win32" ? path.join(api.info.appPath, binaryPath) : path.join(api.info.appPath, binaryPath);
        }

        const stream = extractFull(archivePath, outputPath, {
            $bin: binaryPath,
        });

        stream.on("error", reject);
        stream.on("end", resolve);
    });
}
