import { ExcludeMethods } from "jaz-ts-utils";

export class Spectator {
    public name!: string;

    constructor(args: ExcludeMethods<typeof Spectator.prototype>) {
        Object.assign(this, args);
    }
}