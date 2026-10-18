// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentType } from "@main/content/content-ref";
import { infosStore } from "@renderer/store/infos.store";
import { canAcquireInEdition } from "@shared/edition";

// Whether this client can fetch content of this type at all. Engines and games come with the install on
// an edition that does not download them, so offering a download for one would only fail.
function canAcquire(type: ContentType) {
    return canAcquireInEdition(infosStore.features, type);
}

// An engine or game is missing and nothing in the client can supply it, so offering retries or a
// download would only send the player round in circles. Only the store that installed it can put it back.
function isInstallationIncomplete(installed: { engine: boolean; game: boolean }) {
    return (!installed.engine && !canAcquire("engine")) || (!installed.game && !canAcquire("game"));
}

export const editionLogic = {
    canAcquire,
    isInstallationIncomplete,
};
