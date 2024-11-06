import { initBattleStore } from "@renderer/store/battle.store";
import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
import { initInfosStore } from "@renderer/store/infos.store";

import { initSettingsStore } from "@renderer/store/settings.store";

export async function initPreMountStores() {
    await Promise.all([initSettingsStore(), initInfosStore(), initGameStore(), initDownloadsStore(), initBattleStore(), initEnginesStore()]);
}
