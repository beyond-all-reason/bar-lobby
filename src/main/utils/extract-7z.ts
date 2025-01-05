import { unpack, cmd } from "$/7zip-min/7zip-min";

export function extract7z(archivePath: string, outputPath: string) {
    return new Promise<void>((resolve, reject) => {
        unpack(archivePath, outputPath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function extractSpecificFiles(archivePath: string, outputPath: string, files: string[]) {
    return new Promise<void>((resolve, reject) => {
        cmd(["x", archivePath, "-y", `-o${outputPath}`, ...files], (err) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                // const extractedFiles = fs.readdirSync(outputPath);
                // resolve(extractedFiles);
                resolve();
            }
        });
    });
}
