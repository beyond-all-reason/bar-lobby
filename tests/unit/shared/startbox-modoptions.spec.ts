// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import zlib from "zlib";
import { describe, expect, it } from "vitest";

import { decodeModoptionValue, parseStartboxOverrideInput, resolveArrangement, StartboxArrangement } from "@shared/startbox-modoptions";

function arrangement(boxCount: number): StartboxArrangement {
    return {
        startboxes: Array.from({ length: boxCount }, (_, i) => ({
            poly: [
                { x: i, y: 0 },
                { x: i + 1, y: 200 },
            ],
        })),
    };
}

describe("decodeModoptionValue", () => {
    it("reads values encoded the way maps-metadata encodes them", async () => {
        const set = { "2": arrangement(2) };
        const encoded = zlib.deflateSync(JSON.stringify(set)).toString("base64url").replace(/=+$/, "");

        expect(await decodeModoptionValue(encoded)).toEqual(set);
    });

    it("reads an uncompressed payload, as the game does", async () => {
        const override = arrangement(2);

        expect(await decodeModoptionValue(Buffer.from(JSON.stringify(override)).toString("base64url"))).toEqual(override);
    });

    it("returns undefined for a value the game could not read either", async () => {
        expect(await decodeModoptionValue("0")).toBeUndefined();
        expect(await decodeModoptionValue("not base64!")).toBeUndefined();
    });
});

describe("resolveArrangement", () => {
    const set = { "2": arrangement(2), "4": arrangement(4), "6": arrangement(6) };

    it("prefers an override that covers every team, spares included", () => {
        const override = arrangement(5);

        expect(resolveArrangement(override, set, 4)).toBe(override);
        expect(resolveArrangement(override, set, 6)).toBe(set["6"]);
    });

    it("falls back from the exact count to the next larger, then the next smaller", () => {
        expect(resolveArrangement(undefined, set, 4)).toBe(set["4"]);
        expect(resolveArrangement(undefined, set, 3)).toBe(set["4"]);
        expect(resolveArrangement(undefined, set, 8)).toBe(set["6"]);
        expect(resolveArrangement(undefined, undefined, 2)).toBeUndefined();
    });
});

describe("parseStartboxOverrideInput", () => {
    it("takes the value from the command the in-game start position tool copies", () => {
        expect(parseStartboxOverrideInput("!bSet mapmetadata_startbox_override eJyrVkrOzytJzSvRK8nPS1WyUlAqSsxLKc5Mz1OqBQA")).toBe("eJyrVkrOzytJzSvRK8nPS1WyUlAqSsxLKc5Mz1OqBQA");
        expect(parseStartboxOverrideInput("  eJyrVkrOzytJ  ")).toBe("eJyrVkrOzytJ");
        expect(parseStartboxOverrideInput("!bSet tweakdefs eJyrVkrOzytJ")).toBeUndefined();
    });
});
