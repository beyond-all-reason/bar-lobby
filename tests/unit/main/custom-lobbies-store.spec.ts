// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { FileStore } from "@main/json/file-store";
import { customLobbiesSchema } from "@main/json/model/custom-lobbies";
import { DEFAULT_LOBBY_LIST_QUERY } from "@shared/lobby-list-query";

let dir: string;
let file: string;

async function load(contents?: unknown) {
    if (contents !== undefined) fs.writeFileSync(file, JSON.stringify(contents));
    return (await new FileStore<typeof customLobbiesSchema>(file, customLobbiesSchema).init()).model;
}

beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "custom-lobbies-"));
    file = path.join(dir, "custom-lobbies.json");
});

afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
});

describe("custom lobbies file", () => {
    it("starts from the defaults", async () => {
        const model = await load();
        expect(model).toEqual({ query: DEFAULT_LOBBY_LIST_QUERY, tagsServer: "", autoRefresh: false });
    });

    // The file is validated with coerceTypes, which can turn false into null if the schema allows null.
    it("keeps tri-state filters as they were saved", async () => {
        const filters = { passworded: true, bossMode: false };
        const model = await load({ query: { filters, sort: { key: "name", order: 1 } }, tagsServer: "server", autoRefresh: true });
        expect(model.query.filters).toEqual(filters);
        expect(model.autoRefresh).toBe(true);
    });

    it("resets only itself when the saved query is no longer valid", async () => {
        const model = await load({ query: { filters: {}, sort: { key: "removedSortKey", order: 1 } }, tagsServer: "server", autoRefresh: true });
        expect(model).toEqual({ query: DEFAULT_LOBBY_LIST_QUERY, tagsServer: "", autoRefresh: false });
        expect(fs.existsSync(`${file}.invalid`)).toBe(true);
    });
});
