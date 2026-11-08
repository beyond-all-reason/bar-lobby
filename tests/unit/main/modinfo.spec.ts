// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { archiveGameName, readModInfo } from "@main/content/singleplayer/modinfo";

const read = (lua: string) => readModInfo(Buffer.from(lua, "utf8"));

// The mission API team's outpost-strike example, as shipped.
const OUTPOST_STRIKE = `-- SPDX-FileCopyrightText: 2026 Beyond All Reason contributors
--
-- SPDX-License-Identifier: GPL-2.0-or-later

-- The Outpost Strike scenario's mutator: the released game plus the mission's Lua and in-game text.
return {
	name = "bar-scenario-outpost-strike",
	description = "Outpost Strike, an example scenario for the Mission API",
	shortName = "BSOS",
	version = "1.0",
	modtype = 1,
	depend = { "Beyond All Reason test-31820-45ea098" },
}
`;

describe("readModInfo", () => {
    it("reads the outpost-strike example, comment header and all", () => {
        const result = read(OUTPOST_STRIKE);

        expect(result).toEqual({ modInfo: { name: "bar-scenario-outpost-strike", version: "1.0", depend: ["Beyond All Reason test-31820-45ea098"] } });
        expect("modInfo" in result && archiveGameName(result.modInfo)).toBe("bar-scenario-outpost-strike 1.0");
    });

    it("decodes escapes and UTF-8 in strings", () => {
        expect(read(`return { name = "bar-scenario-café", version = "1.0 \\"b\\"\\065" }`)).toEqual({
            modInfo: { name: "bar-scenario-café", version: '1.0 "b"A', depend: [] },
        });
    });

    it("accepts other fields holding any literal, including negative numbers and nested tables", () => {
        expect(read(`return { name = "a", version = "1", modtype = -1, flags = { true, nil, 2, "x", { 3 } } }`)).toEqual({ modInfo: { name: "a", version: "1", depend: [] } });
    });

    it.each([
        ["no version", `return { name = "a" }`, /must set version/],
        ["an empty version", `return { name = "a", version = "" }`, /must set version/],
        ["a numeric version", `return { name = "a", version = 1.0 }`, /must set version/],
        ["no name", `return { version = "1" }`, /must set name/],
        ["an empty name", `return { name = "", version = "1" }`, /must set name/],
        ["a function call in name", `return { name = string.format("a"), version = "1" }`, /plain table of literal values; name is not/],
        ["a variable in version", `local v = "1"\nreturn { name = "a", version = v }`, /returned by its only statement/],
        ["concatenation in version", `return { name = "a", version = "1" .. ".0" }`, /plain table of literal values; version is not/],
        ["a variable as a value", `return { name = "a", version = "1", description = desc }`, /description is not/],
        ["a non-table return", `return "a"`, /returned by its only statement/],
        ["an extra statement", `x = 1\nreturn { name = "a", version = "1" }`, /returned by its only statement/],
        ["no return", `local t = { name = "a" }`, /returned by its only statement/],
        ["a computed key", `return { ["name"] = "a", version = "1" }`, /every field needs a name/],
        ["a positional field", `return { "a", name = "a", version = "1" }`, /every field needs a name/],
        ["a non-string depend entry", `return { name = "a", version = "1", depend = { 1 } }`, /depend must be a table of strings/],
        ["a depend that isn't a table", `return { name = "a", version = "1", depend = "game" }`, /depend must be a table of strings/],
        ["Lua that doesn't parse", `return {`, /could not be parsed/],
    ])("refuses %s", (_, lua, message) => {
        const result = read(lua);

        expect("error" in result && result.error).toMatch(message);
    });
});

// RecoilEngine's ArchiveData constructor leaves the version off when the name contains it anywhere.
describe("archiveGameName", () => {
    const named = (name: string, version: string) => archiveGameName({ name, version, depend: [] });

    it("appends the version, after a space", () => {
        expect(named("bar-scenario-outpost-strike", "1.0")).toBe("bar-scenario-outpost-strike 1.0");
    });

    it.each([
        ["at the end", "bar-campaign-act1", "1"],
        ["at the start", "2-bar-scenario-raid", "2"],
        ["in the middle", "bar-scenario-v3-raid", "v3"],
    ])("leaves the name alone when the version occurs %s of it", (_, name, version) => {
        expect(named(name, version)).toBe(name);
    });

    it("matches case, as the engine does", () => {
        expect(named("bar-campaign-act-v1", "V1")).toBe("bar-campaign-act-v1 V1");
    });

    it("leaves the name alone without a version", () => {
        expect(named("bar-scenario-outpost-strike", "")).toBe("bar-scenario-outpost-strike");
    });
});
