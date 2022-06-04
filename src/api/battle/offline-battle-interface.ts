import { AbstractBattleInterface } from "@/api/battle/abstract-battle-interface";

export class OfflineBattleInterface extends AbstractBattleInterface {
    public changeMap(map: string) {
        console.log(`Changing map to ${map}`);
    }
}
