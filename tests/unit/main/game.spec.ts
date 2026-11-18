// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import type { Replay } from "@main/replays/replay";
import { EditionRefusalError } from "@shared/edition";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ensure, spawn, session, beginSession } = vi.hoisted(() => {
    const session = { started: vi.fn(), end: vi.fn(async () => undefined) };
    return { ensure: vi.fn(), spawn: vi.fn(), session, beginSession: vi.fn(async () => session) };
});

vi.mock("child_process", () => ({ spawn }));
vi.mock("fs", () => ({ promises: { writeFile: vi.fn(async () => undefined) } }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { ensure, markUsed: vi.fn(async () => undefined) } }));
vi.mock("@main/game/engine-config/engine-config", () => ({ engineConfig: { beginSession } }));
vi.mock("@main/utils/start-script-converter", () => ({ startScriptConverter: { generateScriptStr: vi.fn(async () => "[game] {}") } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({
    WRITE_DATA_PATH: "/state/data",
    REPLAYS_PATH: "/state/data/demos",
    ENGINE_DEFAULTS_PATH: "/state/engine-config/defaults",
    getEnginePath: () => "/assets/engine",
    getAssetsPath: () => "/assets",
}));

import { GameAPI } from "@main/game/game";

const script = `[game] {
    mapname=Quicksilver 1.2;
    gametype=Beyond All Reason test-1-abc;
}`;

describe("GameAPI launch", () => {
    let game: GameAPI;

    beforeEach(() => {
        ensure.mockReset().mockResolvedValue(undefined);
        beginSession.mockClear();
        session.started.mockClear();
        session.end.mockClear();
        // Spawning is where these tests stop: anything that reaches it has already passed the content check.
        spawn.mockReset().mockImplementation(() => {
            throw new Error("spawned");
        });
        game = new GameAPI();
    });

    it("asks for the map along with the engine and game", async () => {
        await expect(game.launchScript({ engineVersion: "2025.01.3", gameVersion: "byar:test", script })).rejects.toThrow("spawned");

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2025.01.3" },
            { type: "game", id: "Beyond All Reason test-1-abc" },
            { type: "map", id: "Quicksilver 1.2" },
        ]);
    });

    // Which content is refused is up to ensure, which is mocked here, so one refusal stands for all of them.
    it("does not start the game when content cannot be had", async () => {
        ensure.mockRejectedValue(new EditionRefusalError("content_unavailable_in_edition", "missing"));

        await expect(game.launchReplay({ engineVersion: "2025.01.3", gameVersion: "Beyond All Reason test-1-abc", mapSpringName: "Quicksilver 1.2", fileName: "a.sdfz" } as Replay)).rejects.toThrow(
            "content_unavailable_in_edition"
        );

        expect(spawn).not.toHaveBeenCalled();
    });

    it("leaves the map out when the launch does not name one", async () => {
        await expect(game.launchMultiplayer({ engineVersion: "2025.01.3", gameVersion: "Beyond All Reason test-1-abc", springString: "spring://host" })).rejects.toThrow("spawned");

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2025.01.3" },
            { type: "game", id: "Beyond All Reason test-1-abc" },
        ]);
    });

    // The mission archive and a map the mission ships are on the engine's path, but aren't content to fetch.
    it("launches a mission with its own data directories, asking only for the engine and base game", async () => {
        const dataDirs = ["/content/campaigns/sample", "/content/campaigns/sample/shared", "/content/campaigns/sample/mission01"];

        await expect(game.launchMission({ engineVersion: "2026.07.04", gameVersion: "Beyond All Reason test-31820-45ea098", script: "[game] {}", dataDirs })).rejects.toThrow("spawned");

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2026.07.04" },
            { type: "game", id: "Beyond All Reason test-31820-45ea098" },
        ]);
        expect(spawn.mock.calls[0][2].env.SPRING_DATADIR).toBe(["/state/engine-config/defaults", "/assets", ...dataDirs].join(path.delimiter));
    });

    it("gives other launches the assets alone", async () => {
        await expect(game.launchScript({ engineVersion: "2025.01.3", gameVersion: "byar:test", script })).rejects.toThrow("spawned");

        expect(spawn.mock.calls[0][2].env.SPRING_DATADIR).toBe(["/state/engine-config/defaults", "/assets"].join(path.delimiter));
    });
});

// A process the test drives: it prints, exits and closes when told to.
function fakeProcess(pid = 4242) {
    const proc = Object.assign(new EventEmitter(), { pid, stdout: new EventEmitter(), stderr: new EventEmitter(), kill: vi.fn() });
    const print = (text: string) => proc.stdout.emit("data", Buffer.from(text));
    const close = (code = 0) => {
        proc.emit("exit", code);
        proc.emit("close", code);
    };

    return { proc, print, close };
}

describe("GameAPI engine settings session", () => {
    let game: GameAPI;

    beforeEach(() => {
        ensure.mockReset().mockResolvedValue(undefined);
        beginSession.mockClear();
        session.started.mockClear();
        session.end.mockClear();
        spawn.mockReset();
        game = new GameAPI();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const launch = () => game.launchMultiplayer({ engineVersion: "2026.07.04", gameVersion: "Beyond All Reason test-1-abc", springString: "spring://host" });

    it("begins the session for the launch's engine only once its content is there", async () => {
        ensure.mockRejectedValue(new Error("missing"));
        await expect(launch()).rejects.toThrow("missing");
        expect(beginSession).not.toHaveBeenCalled();

        ensure.mockResolvedValue(undefined);
        spawn.mockImplementation(() => {
            throw new Error("spawned");
        });
        await expect(launch()).rejects.toThrow("spawned");
        expect(beginSession).toHaveBeenCalledWith("2026.07.04");
    });

    it("ends the session when spawning throws", async () => {
        spawn.mockImplementation(() => {
            throw new Error("spawned");
        });
        await expect(launch()).rejects.toThrow("spawned");

        expect(session.end).toHaveBeenCalled();
    });

    it("records the pid, and ends the session on close rather than on the engine's last log line", async () => {
        const { proc, print, close } = fakeProcess();
        spawn.mockReturnValue(proc);
        const launched = launch();
        await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
        print("[Game::Load]");
        await launched;

        expect(session.started).toHaveBeenCalledWith(4242);

        print("[SpringApp::Kill][8]");
        expect(session.end).not.toHaveBeenCalled();

        close();
        expect(session.end).toHaveBeenCalledTimes(1);
    });

    it("ends the session when the process can't be started", async () => {
        const { proc } = fakeProcess();
        spawn.mockReturnValue(proc);
        void launch().catch(() => {});
        await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
        proc.emit("error", new Error("spawn ENOENT"));

        expect(session.end).toHaveBeenCalled();
    });

    it("waits for a game that asked to close before the next launch begins its session", async () => {
        const first = fakeProcess(1);
        spawn.mockReturnValueOnce(first.proc);
        const launched = launch();
        await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(1));
        first.print("[Game::Load]");
        await launched;
        first.print("[SpringApp::Kill][8]");

        const second = fakeProcess(2);
        spawn.mockReturnValueOnce(second.proc);
        void launch().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(beginSession).toHaveBeenCalledTimes(1);

        first.close();
        await vi.waitFor(() => expect(beginSession).toHaveBeenCalledTimes(2));
        expect(first.proc.kill).not.toHaveBeenCalled();
    });

    it("stops a game that asked to close but hasn't after 15 seconds", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const first = fakeProcess(1);
        spawn.mockReturnValueOnce(first.proc);
        first.proc.kill.mockImplementation(() => first.close());
        const launched = launch();
        await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(1));
        first.print("[Game::Load]");
        await launched;
        first.print("[SpringApp::Kill][8]");

        spawn.mockReturnValueOnce(fakeProcess(2).proc);
        void launch().catch(() => {});
        await vi.advanceTimersByTimeAsync(14_999);
        expect(first.proc.kill).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(first.proc.kill).toHaveBeenCalled();
        await vi.waitFor(() => expect(beginSession).toHaveBeenCalledTimes(2));
    });
});
