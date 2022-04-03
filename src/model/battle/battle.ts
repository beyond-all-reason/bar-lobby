import { AllyTeam } from "@/model/battle/ally-team";
import { Spectator } from "@/model/battle/spectator";
import { BattleOptions, Restriction } from "@/model/battle/types";
import { ExcludeMethods } from "jaz-ts-utils";

export class Battle {
    public readonly battleOptions: BattleOptions;
    public readonly allyTeams: AllyTeam[];
    public readonly spectators: Spectator[];
    public readonly gameOptions?: Record<string, string | number | boolean>;
    public readonly mapOptions?: Record<string, string | number | boolean>;
    public readonly restrictions?: Restriction[];

    constructor(args: ExcludeMethods<typeof Battle.prototype>) {
        Object.assign(this, args);
    }

    public getBattlers() {
        return this.allyTeams.flatMap(allyTeam => allyTeam.battlers);
    }
}