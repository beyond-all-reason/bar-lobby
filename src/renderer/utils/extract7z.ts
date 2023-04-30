import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function extract7z(archivePath: string, outputName: string) {
    const archivePathObj = path.parse(archivePath);
    const outputPath = path.join(archivePathObj.dir, outputName);

    const binaryName = process.platform === "win32" ? "7za.exe" : "7za";
    const path7z = path.join(api.info.resourcesPath, binaryName);

    const { stdout, stderr } = await execPromise(`"${path7z}" x "${archivePath}" -aoa -o"${outputPath}"`);

    if (stderr) {
        throw new Error("Error in 7z extraction\n" + stderr);
    }
}
