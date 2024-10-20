import { Readable } from "stream";

export class BufferStream {
    public readStream: Readable;
    public isBigEndian: boolean;

    constructor(buffer: Buffer, isBigEndian = false) {
        this.isBigEndian = isBigEndian;

        this.readStream = new Readable();
        this.readStream.push(buffer);
        this.readStream.push(null);
    }

    public readString(size?: number, trimNulls = true) {
        const str = this.read(size).toString();
        if (trimNulls) {
            return str.replace(/\0/g, "");
        }

        return str;
    }

    public readInt(size: 1 | 2 | 3 | 4 = 4, unsigned = false) : number {
        if (unsigned) {
            return this.isBigEndian ? this.read(size).readUIntBE(0, size) : this.read(size).readUIntLE(0, size);
        } else {
            return this.isBigEndian ? this.read(size).readIntBE(0, size) : this.read(size).readIntLE(0, size);
        }
    }

    public readInts(amount: number, size: 1 | 2 | 3 | 4 = 4, unsigned = false) : number[] {
        const nums: number[] = [];
        for (let i=0; i<amount; i++) {
            nums.push(this.readInt(size, unsigned));
        }
        return nums;
    }

    public readBigInt(unsigned = false) : bigint {
        if (unsigned) {
            return this.isBigEndian ? this.read(8).readBigUInt64BE() : this.read(8).readBigUInt64LE();
        } else {
            return this.isBigEndian ? this.read(8).readBigInt64BE() : this.read(8).readBigInt64LE();
        }
    }

    public readFloat() : number {
        return this.isBigEndian ? this.read(4).readFloatBE() : this.read(4).readFloatLE();
    }

    public readFloats(amount: number) : number[] {
        const nums: number[] = [];
        for (let i=0; i<amount; i++) {
            nums.push(this.readFloat());
        }
        return nums;
    }

    public readUntilNull(writeBuffer: number[] = []) : Buffer {
        const byte = this.read(1)[0];
        if (byte === 0x00) {
            return Buffer.from(writeBuffer);
        } else {
            writeBuffer.push(byte);
            return this.readUntilNull(writeBuffer);
        }
    }

    public readIntFloatPairs() : number[][] {
        const options: number[][] = [];
        const size = this.readStream.readableLength / 8;
        for (let i=0; i < size; i++) {
            const key = this.readInt();
            const val = this.readFloat();
            options.push([key, val]);
        }
        return options;
    }

    public readBool() : boolean {
        const int = this.readInt(1, true);
        return Boolean(int);
    }

    public read(size?: number) {
        return this.readStream.read(size) as Buffer;
    }

    public destroy() {
        this.readStream.destroy();
    }
}