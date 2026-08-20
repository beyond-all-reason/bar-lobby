// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { compareEngineVersions, isCompatibleEngineVersion } from "@main/content/engine/engine-version-order";
import { describe, expect, it } from "vitest";

describe("isCompatibleEngineVersion", () => {
    it.each(["2025.01.3", "2025.01.10", "2025.01.3-rc1", "local-dev"])("accepts %s", (id) => {
        expect(isCompatibleEngineVersion(id)).toBe(true);
    });

    it.each(["105.1.1-2590-gb9462a0", "2025.1.3", "spring_bar_.rel2501", ""])("rejects %s", (id) => {
        expect(isCompatibleEngineVersion(id)).toBe(false);
    });
});

describe("compareEngineVersions", () => {
    it("orders by patch numerically rather than as a string", () => {
        expect(compareEngineVersions("2025.01.10", "2025.01.3")).toBeGreaterThan(0);
    });

    it("orders a release above its release candidates", () => {
        expect(compareEngineVersions("2025.01.3", "2025.01.3-rc1")).toBeGreaterThan(0);
        expect(compareEngineVersions("2025.01.3-rc2", "2025.01.3-rc10")).toBeLessThan(0);
    });

    it("orders by year then month", () => {
        expect(compareEngineVersions("2026.01.1", "2025.12.9")).toBeGreaterThan(0);
        expect(compareEngineVersions("2025.02.1", "2025.10.1")).toBeLessThan(0);
    });

    it("treats equal versions as equal", () => {
        expect(compareEngineVersions("2025.01.3", "2025.01.3")).toBe(0);
    });

    it("sorts unparseable versions below parseable ones", () => {
        expect(compareEngineVersions("local-dev", "2025.01.3")).toBeLessThan(0);
        expect(compareEngineVersions("2025.01.3", "local-dev")).toBeGreaterThan(0);
        expect(compareEngineVersions("local-a", "local-b")).toBe(0);
    });

    it("puts the newest last when used as a sort comparator", () => {
        const sorted = ["2025.01.3", "local-dev", "2025.01.10", "2025.01.10-rc1", "2024.12.1"].sort(compareEngineVersions);

        expect(sorted).toEqual(["local-dev", "2024.12.1", "2025.01.3", "2025.01.10-rc1", "2025.01.10"]);
    });
});
