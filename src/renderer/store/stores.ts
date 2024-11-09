import { initBattleStore } from "@renderer/store/battle.store";
import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
import { initInfosStore } from "@renderer/store/infos.store";
import { initMapsStore } from "@renderer/store/maps.store";
import { initReplaysStore } from "@renderer/store/replays.store";
import { initSettingsStore } from "@renderer/store/settings.store";
import { initUnitsStore } from "@renderer/store/units.store";

export async function initStores() {
    await Promise.all([
        initMapsStore(),
        initReplaysStore(),
        initSettingsStore(),
        initInfosStore(),
        initGameStore(),
        initDownloadsStore(),
        initBattleStore(),
        initEnginesStore(),
        initBattleStore(),
        initUnitsStore(),
    ]);
}
