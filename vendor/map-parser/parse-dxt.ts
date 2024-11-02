export function parseDxt(buffer: Buffer, width: number, height: number): Buffer {
    try {
        return decompress(width, height, buffer);
    } catch (err) {
        console.error(err);
        throw new Error("Error parsing DXT");
    }
}

/**
 * Useful sources:
 * https://www.khronos.org/opengl/wiki/S3_Texture_Compression
 * https://www.khronos.org/registry/DataFormat/specs/1.1/dataformat.1.1.html#S3TC
 */
const DXT1BlockSize = 8;

const RGBABlockSize = 64;
const BlockWidth = 4;
const BlockHeight = 4;

function decompressBlockDXT1(data: Uint8Array, outArray?: Uint8Array) {
    const cVal0 = (data[1] << 8) + data[0];
    const cVal1 = (data[3] << 8) + data[2];
    const lookup = generateDXT1Lookup(cVal0, cVal1);

    const out = outArray || new Uint8Array(RGBABlockSize);
    for (let i = 0; i < 16; i++) {
        const bitOffset = i * 2;
        const byte = 4 + Math.floor(bitOffset / 8);
        const bits = (data[byte] >> bitOffset % 8) & 3;

        out[i * 4 + 0] = lookup[bits * 4 + 0];
        out[i * 4 + 1] = lookup[bits * 4 + 1];
        out[i * 4 + 2] = lookup[bits * 4 + 2];
        out[i * 4 + 3] = lookup[bits * 4 + 3];
    }

    return out;
}

function decompress(width: number, height: number, data: Uint8Array) {
    if (width % BlockWidth !== 0) {
        throw new Error("Width of the texture must be divisible by 4");
    }
    if (height % BlockHeight !== 0) {
        throw new Error("Height of the texture must be divisible by 4");
    }
    if (width < BlockWidth || height < BlockHeight) {
        throw new Error("Size of the texture is to small");
    }

    const w = width / BlockWidth;
    const h = height / BlockHeight;
    const blockNumber = w * h;

    //if (blockNumber * DXT1BlockSize != data.length) throw new Error("Data does not match dimensions");

    const out = new Uint8Array(width * height * 4);
    const blockBuffer = new Uint8Array(RGBABlockSize);

    for (let i = 0; i < blockNumber; i++) {
        const decompressed = decompressBlockDXT1(data.slice(i * DXT1BlockSize, (i + 1) * DXT1BlockSize), blockBuffer);

        const pixelX = (i % w) * 4;
        const pixelY = Math.floor(i / w) * 4;

        let j = 0;
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const px = x + pixelX;
                const py = y + pixelY;
                out[px * 4 + py * 4 * width] = decompressed[j];
                out[px * 4 + py * 4 * width + 1] = decompressed[j + 1];
                out[px * 4 + py * 4 * width + 2] = decompressed[j + 2];
                out[px * 4 + py * 4 * width + 3] = decompressed[j + 3];
                j += 4;
            }
        }
    }

    return Buffer.from(out);
}

function generateDXT1Lookup(colorValue0: number, colorValue1: number, out: Uint8Array | null = null) {
    const color0 = getComponentsFromRGB565(colorValue0);
    const color1 = getComponentsFromRGB565(colorValue1);

    const lookup = out || new Uint8Array(16);

    if (colorValue0 > colorValue1) {
        // Non transparent mode
        lookup[0] = Math.floor(color0.R * 255);
        lookup[1] = Math.floor(color0.G * 255);
        lookup[2] = Math.floor(color0.B * 255);
        lookup[3] = Math.floor(255);

        lookup[4] = Math.floor(color1.R * 255);
        lookup[5] = Math.floor(color1.G * 255);
        lookup[6] = Math.floor(color1.B * 255);
        lookup[7] = Math.floor(255);

        lookup[8] = Math.floor(((color0.R * 2) / 3 + (color1.R * 1) / 3) * 255);
        lookup[9] = Math.floor(((color0.G * 2) / 3 + (color1.G * 1) / 3) * 255);
        lookup[10] = Math.floor(((color0.B * 2) / 3 + (color1.B * 1) / 3) * 255);
        lookup[11] = Math.floor(255);

        lookup[12] = Math.floor(((color0.R * 1) / 3 + (color1.R * 2) / 3) * 255);
        lookup[13] = Math.floor(((color0.G * 1) / 3 + (color1.G * 2) / 3) * 255);
        lookup[14] = Math.floor(((color0.B * 1) / 3 + (color1.B * 2) / 3) * 255);
        lookup[15] = Math.floor(255);
    } else {
        // transparent mode
        lookup[0] = Math.floor(color0.R * 255);
        lookup[1] = Math.floor(color0.G * 255);
        lookup[2] = Math.floor(color0.B * 255);
        lookup[3] = Math.floor(255);

        lookup[4] = Math.floor(((color0.R * 1) / 2 + (color1.R * 1) / 2) * 255);
        lookup[5] = Math.floor(((color0.G * 1) / 2 + (color1.G * 1) / 2) * 255);
        lookup[6] = Math.floor(((color0.B * 1) / 2 + (color1.B * 1) / 2) * 255);
        lookup[7] = Math.floor(255);

        lookup[8] = Math.floor(color1.R * 255);
        lookup[9] = Math.floor(color1.G * 255);
        lookup[10] = Math.floor(color1.B * 255);
        lookup[11] = Math.floor(255);

        lookup[12] = Math.floor(0);
        lookup[13] = Math.floor(0);
        lookup[14] = Math.floor(0);
        lookup[15] = Math.floor(0);
    }

    return lookup;
}

function getComponentsFromRGB565(color: any) {
    return {
        R: ((color & 0b11111000_00000000) >> 8) / 0xff,
        G: ((color & 0b00000111_11100000) >> 3) / 0xff,
        B: ((color & 0b00000000_00011111) << 3) / 0xff,
    };
}

function makeRGB565(r: any, g: any, b: any) {
    return ((r & 0b11111000) << 8) | ((g & 0b11111100) << 3) | ((b & 0b11111000) >> 3);
}
