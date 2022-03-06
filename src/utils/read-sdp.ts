import * as fs from "fs";
import * as zlib from "zlib";
import { BufferStream } from "jaz-ts-utils";
import { SdpEntry } from "@/model/sdp";

export async function parseSdp(sdpFilePath: string, fileFilter?: string[]) : Promise<SdpEntry[]> {
    const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
    const sdpFile = zlib.gunzipSync(sdpFileZipped);

    const bufferStream = new BufferStream(sdpFile, true);

    const fileData: SdpEntry[] = [];

    while (bufferStream.readStream.readableLength > 0 && fileFilter?.length !== fileData.length) {
        const fileNameLength = bufferStream.readInt(1);
        const fileName = bufferStream.readString(fileNameLength);
        const md5 = bufferStream.read(16).toString("hex");
        const crc32 = bufferStream.read(4).toString("hex");
        const filesizeBytes = bufferStream.readInt(4, true);

        if (fileFilter?.includes(fileName)) {
            fileData.push({ fileName, md5, crc32, filesizeBytes });
        } else if (!fileFilter) {
            fileData.push({ fileName, md5, crc32, filesizeBytes });
        }
    }

    return fileData;
}