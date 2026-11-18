// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, getConfigVars } = vi.hoisted(() => ({ state: { dir: "" }, getConfigVars: vi.fn<(version: string) => Promise<undefined>>(async () => undefined) }));

vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({ getEnginePath: () => state.dir }));
vi.mock("@main/config/install-defaults", () => ({ getDefaultEngineVersion: () => "2026.07.04" }));
vi.mock("@main/game/engine-config/config-vars", () => ({ getConfigVars }));
vi.mock("@main/config/content-sources", () => ({ getEngineReleaseInfo: vi.fn() }));

import { EngineProvider } from "@main/content/engine/engine-provider";

beforeEach(async () => {
    state.dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-engines-"));
    getConfigVars.mockClear();
});

afterEach(async () => {
    await fs.rm(state.dir, { recursive: true, force: true });
});

const install = (version: string) => fs.mkdir(path.join(state.dir, version, "AI", "Skirmish"), { recursive: true });

describe("EngineProvider init", () => {
    // A locked campaign engine is played as well as the default, and a Steam depot installs both without the
    // client downloading either.
    it("lists the config variables of every installed engine ahead of time", async () => {
        await install("2026.07.04");
        await install("2025.06.21");

        await new EngineProvider().init();

        expect(getConfigVars.mock.calls.map(([version]) => version).sort()).toEqual(["2025.06.21", "2026.07.04"]);
    });

    it("lists nothing for a default engine that isn't installed", async () => {
        await new EngineProvider().init();

        expect(getConfigVars).not.toHaveBeenCalled();
    });
});
