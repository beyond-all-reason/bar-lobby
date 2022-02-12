import * as fs from "fs";
import * as zlib from "zlib";
import { BufferStream } from "jaz-ts-utils";

export async function readSdp(sdpFilePath: string) {
    const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
    const sdpFile = zlib.gunzipSync(sdpFileZipped);

    const bufferStream = new BufferStream(sdpFile);

    const fileData: any[] = [];

    while (bufferStream.readStream.readableLength > 0) {
        const fileNameLength = bufferStream.readInt(1);
        const fileName = bufferStream.readString(fileNameLength);
        const md5Digest = bufferStream.read(16);
        const crc32 = bufferStream.readString(4);
        const filesize = bufferStream.readString(4);

        fileData.push({
            fileNameLength,
            fileName,
            md5Digest: md5Digest.toString("hex"),
            crc32,
            filesize
        });
    }
}