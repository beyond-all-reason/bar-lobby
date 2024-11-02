import fs from "fs";

export async function isFileInUse(filePath: string): Promise<boolean> {
    try {
        const file = await fs.promises.open(filePath, fs.constants.O_RDONLY | 0x10000000);
        await file.close();
        return false;
    } catch {
        return true;
    }
}
