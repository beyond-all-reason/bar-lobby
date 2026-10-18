// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentType } from "@main/content/content-ref";
import type { TranslationKey } from "@renderer/i18n";
import { infosStore } from "@renderer/store/infos.store";
import { canAcquireInEdition, EditionRefusal } from "@shared/edition";

// Keyed on every code main can refuse with, so a new one does not compile until it has wording. Each
// message takes the refused names as {content} and is pluralised on how many there are.
const refusalMessageKeys: Record<EditionRefusal, TranslationKey> = {
    content_bundled_with_install: "lobby.logic.edition.refusals.contentBundledWithInstall",
    assets_path_fixed: "lobby.logic.edition.refusals.assetsPathFixed",
};

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

function refusalMessageKey(refusal: EditionRefusal) {
    return refusalMessageKeys[refusal];
}

export const editionLogic = {
    canAcquire,
    isInstallationIncomplete,
    refusalMessageKey,
};
