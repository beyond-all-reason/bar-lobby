import { Battler, BattlerConfig } from "@/model/battle/battler";

export interface PlayerConfig extends BattlerConfig {
    name: string;
    userId?: number;
}

export class Player extends Battler implements PlayerConfig {
    public name: string;
    public userId?: number;

    constructor(config: PlayerConfig) {
        super(config);

        this.name = config.name;
        this.userId = config.userId;
    }
}