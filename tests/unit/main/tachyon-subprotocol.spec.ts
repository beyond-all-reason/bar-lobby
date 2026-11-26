// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { getTachyonSubprotocol } from "@main/tachyon/subprotocol";

describe("getTachyonSubprotocol", () => {
    it("uses major and minor of the protocol version, dropping the patch", () => {
        expect(getTachyonSubprotocol("1.25.3")).toBe("v1.25.tachyon");
    });

    it("defaults to the installed tachyon-protocol version", () => {
        expect(getTachyonSubprotocol()).toMatch(/^v\d+\.\d+\.tachyon$/);
    });
});
