import { User } from "@/model/user";

export interface SpectatorConfig {
    user: User;
}

export class Spectator implements SpectatorConfig {
    public user: User;

    constructor(config: SpectatorConfig) {
        this.user = config.user;
    }
}