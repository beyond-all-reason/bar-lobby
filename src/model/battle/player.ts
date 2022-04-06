import { AllyTeam } from "@/model/battle/ally-team";
import { Battler, BattlerConfig } from "@/model/battle/battler";
import { User } from "@/model/user";

export interface PlayerConfig extends BattlerConfig {
    user: User;
}

export class Player extends Battler implements PlayerConfig {
    public user: User;

    constructor(allyTeam: AllyTeam, config: PlayerConfig) {
        super(allyTeam, config);

        this.user = config.user;
    }
}