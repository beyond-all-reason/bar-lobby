// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { infoApi } from "@renderer/api/info";
import { infosStore, infosUpdates } from "@renderer/store/infos.store";

export async function initInfosLogic() {
    if (infosStore.isInitialized) {
        console.warn("Infos store is already initialized. Skipping initialization.");
        return;
    }

    infosUpdates.set(await infoApi.getInfo());
}
