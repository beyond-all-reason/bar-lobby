// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter, Router } from "vue-router";

import { goBackTo, rememberPreviousPage } from "@renderer/utils/go-back-to";

const MAPS = "/library/maps/maps";
const MAP = "/library/maps/some-map";
const MATCHMAKING = "/play/matchmaking";

let router: Router;

beforeEach(async () => {
    const component = { template: "<div />" };
    router = createRouter({
        history: createMemoryHistory(),
        routes: [MAPS, MAP, MATCHMAKING, "/play"].map((path) => ({ path, component })),
    });
    rememberPreviousPage(router);
    await router.push("/play");
});

// Memory history navigates on back() a tick later.
function settle() {
    return new Promise((resolve) => setTimeout(resolve));
}

async function back() {
    router.back();
    await settle();
}

describe("goBackTo", () => {
    it("leaves a map opened from the maps list for the list, then the page before it", async () => {
        await router.push(MAPS);
        await router.push(MAP);

        goBackTo(router, MAPS);
        await settle();
        expect(router.currentRoute.value.path).toBe(MAPS);

        await back();
        expect(router.currentRoute.value.path).toBe("/play");
    });

    // #706
    it("leaves a map opened from matchmaking for the maps list, then matchmaking", async () => {
        await router.push(MATCHMAKING);
        await router.push(MAP);

        goBackTo(router, MAPS);
        await settle();
        expect(router.currentRoute.value.path).toBe(MAPS);

        await back();
        expect(router.currentRoute.value.path).toBe(MATCHMAKING);
    });
});
