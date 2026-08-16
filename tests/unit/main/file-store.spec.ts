// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Type } from "@sinclair/typebox";

import { FileStore } from "@main/json/file-store";

const schema = Type.Object({
    first: Type.String({ default: "" }),
    second: Type.String({ default: "" }),
    count: Type.Number({ default: 0 }),
});

let dir: string;
let file: string;

const onDisk = () => JSON.parse(fs.readFileSync(file, "utf-8"));

async function newStore() {
    const store = new FileStore<typeof schema>(file, schema);
    await store.init();

    return store;
}

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bar-file-store-"));
});

afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
    file = path.join(dir, `store-${Math.random().toString(36).slice(2)}.json`);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("file store", () => {
    it("applies overlapping updates without losing any of them", async () => {
        const store = await newStore();

        await Promise.all([store.update({ first: "a" }), store.update({ second: "b" }), store.update({ count: 3 })]);

        expect(onDisk()).toMatchObject({ first: "a", second: "b", count: 3 });
    });

    it("leaves the file valid JSON after concurrent writes", async () => {
        const store = await newStore();

        await Promise.all(Array.from({ length: 20 }, (_unused, i) => store.update({ count: i })));

        expect(() => onDisk()).not.toThrow();
    });

    it("replaces the file by rename and leaves no temp file behind", async () => {
        const rename = vi.spyOn(fs.promises, "rename");
        const store = await newStore();

        await store.update({ first: "a" });

        expect(rename).toHaveBeenCalled();
        expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    });

    it("keeps the previous contents when a write fails", async () => {
        const store = await newStore();
        await store.update({ first: "before" });

        vi.spyOn(fs.promises, "rename").mockRejectedValueOnce(new Error("locked"));

        await expect(store.update({ first: "after" })).rejects.toThrow("locked");
        expect(onDisk().first).toBe("before");
    });

    it("still writes after a failed write", async () => {
        const store = await newStore();
        await store.update({ first: "before" });

        vi.spyOn(fs.promises, "rename").mockRejectedValueOnce(new Error("locked"));
        await expect(store.update({ second: "x" })).rejects.toThrow("locked");

        vi.restoreAllMocks();
        await store.update({ second: "after" });

        expect(onDisk().second).toBe("after");
    });

    it("reads back what a previous instance wrote", async () => {
        const first = await newStore();
        await first.update({ first: "persisted", count: 7 });

        const second = await newStore();

        expect(second.model.first).toBe("persisted");
        expect(second.model.count).toBe(7);
    });
});
