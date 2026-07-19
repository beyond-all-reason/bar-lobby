// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { expect, it, describe, vi, beforeAll } from "vitest";
import * as fs from "node:fs";
import { generateDiffConfig } from "tools/generate-diff-config";

describe("Generate Diff Config", () => {
    const MOCK_TARGET_PATH = "config.json";
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let output: any;

    beforeAll(() => {
        process.env.BAR_OUTPUT_CONFIG_PATH = MOCK_TARGET_PATH;
        process.env.BAR_OLD_CONFIG_PATH = "old.json";
        process.env.BAR_NEW_CONFIG_PATH = "new.json";
        generateDiffConfig(process.env.BAR_OLD_CONFIG_PATH, process.env.BAR_NEW_CONFIG_PATH);
        const rawWrittenString = writeSpy.mock.calls[0][1] as string;
        output = JSON.parse(rawWrittenString);
    });

    vi.mock("node:fs", async (importOriginal) => {
        const actual = await importOriginal<typeof import("node:fs")>();
        return {
            ...actual,
            readFileSync: vi.fn().mockImplementation((path: string) => {
                if (path === "old.json") {
                    return JSON.stringify({ configUrl: "https://old.com/config.json", oldKey: "old value" });
                } else {
                    return JSON.stringify({ configUrl: "https://new.com/config.json", newKey: "new value" });
                }
            }),
        };
    });

    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    it("should attempt to write a config.json to the expected path", () => {
        expect(writeSpy).toHaveBeenCalledWith(MOCK_TARGET_PATH, expect.any(String), "utf-8");
    });

    it("should always include the configUrl in the diff config", () => {
        expect(output.configUrl).toBeDefined();
    });

    it("should update the configUrl to be from new.json if present", () => {
        expect(output.configUrl).toBe("https://new.com/config.json");
    });

    it("should have values present from old.json that are not replaced by new.json", () => {
        expect(output.oldKey).toBeDefined();
        expect(output.oldKey).toBe("old value");
    });

    it("should include values from the new config that are not a default value in the schema", () => {
        expect(output.newKey).toBeDefined();
        expect(output.newKey).toBe("new value");
    });
});
