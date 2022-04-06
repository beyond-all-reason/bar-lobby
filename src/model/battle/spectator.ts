import { Battle } from "@/model/battle/battle";
import { User } from "@/model/user";

export interface SpectatorConfig {
    user: User;
}

export class Spectator implements SpectatorConfig {
    public static create(battle: Battle, config: SpectatorConfig) {
        const spectator = new Spectator(battle, config);
        return spectator;
    }

    public battle: Battle;
    public user: User;

    protected constructor(battle: Battle, config: SpectatorConfig) {
        this.battle = battle;

        this.user = config.user;
    }
}