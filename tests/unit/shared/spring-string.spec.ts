// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createSpringString } from "@shared/spring-string";
import { expect, it } from "vitest";

it("creates the Spring launch URI", () => {
    expect(createSpringString({ ips: ["127.0.0.1"], port: 8452, username: "tester", password: "secret", battleId: "battle-1" })).toBe("spring://tester:secret@127.0.0.1:8452");
});
