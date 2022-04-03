import { ExcludeMethods } from "jaz-ts-utils";

export interface SpectatorConfig {
    name: string;
}

export class Spectator implements SpectatorConfig {
    public name: string;

    constructor(args: ExcludeMethods<typeof Spectator.prototype>) {
        Object.assign(this, args);
    }
}