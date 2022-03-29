import { defaultBattle } from "@/config/default-battle";
import { BattleTypes } from "@/model/battle";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { reactive } from "vue";

export class BattleAPI {
    public readonly currentBattle: BattleTypes.Battle = reactive(defaultBattle(window.api.session.model.user?.name ?? "Player"));
    protected scriptConverter = new StartScriptConverter();

    public setBattle(battle: BattleTypes.Battle) {
        Object.assign(this.currentBattle, battle);
    }

    public resetToDefault() {
        this.setBattle(defaultBattle(window.api.session.model.user?.name ?? "Player"));
    }
}