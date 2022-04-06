import { AllyTeam, AllyTeamConfig } from "@/model/battle/ally-team";
import { Spectator, SpectatorConfig } from "@/model/battle/spectator";
import { BattleOptions, Restriction } from "@/model/battle/types";

export interface BattleConfig {
    battleOptions: BattleOptions;
    allyTeams?: AllyTeamConfig[];
    spectators?: SpectatorConfig[];
    gameOptions?: Record<string, string | number | boolean>;
    mapOptions?: Record<string, string | number | boolean>;
    restrictions?: Restriction[];
}

export class Battle {
    public static create(config: BattleConfig) {
        const battle = new Battle(config.battleOptions);

        config.allyTeams = config.allyTeams ?? [];
        config.spectators = config.spectators ?? [];

        battle.gameOptions = config.gameOptions ?? {};
        battle.mapOptions = config.mapOptions ?? {};
        battle.restrictions = config.restrictions ?? [];

        config.allyTeams.forEach(allyTeamConfig => {
            const allyTeam = AllyTeam.create(battle, allyTeamConfig);
            battle.addAllyTeam(allyTeam);
        });

        config.spectators.forEach(spectatorConfig => {
            const spectator = Spectator.create(battle, spectatorConfig);
            battle.addSpectator(spectator);
        });

        return battle;
    }

    public battleOptions: BattleOptions;
    public allyTeams: AllyTeam[] = [];
    public spectators: Spectator[] = [];
    public gameOptions: Record<string, string | number | boolean> = {};
    public mapOptions: Record<string, string | number | boolean> = {};
    public restrictions: Restriction[] = [];

    private constructor(battleOptions: BattleOptions) {
        this.battleOptions = battleOptions;
    }

    public addAllyTeam(allyTeam: AllyTeam) : AllyTeam;
    public addAllyTeam(allyTeamConfig: AllyTeamConfig) : AllyTeam;
    public addAllyTeam(prop: AllyTeamConfig | AllyTeam) : AllyTeam {
        if (prop instanceof AllyTeam) {
            if (!this.allyTeams.includes(prop)) {
                this.allyTeams.push(prop);
            }
            return prop;
        } else {
            const allyTeam = AllyTeam.create(this, prop);
            return this.addAllyTeam(allyTeam);
        }
    }

    public getBattlers() {
        return this.allyTeams.flatMap(allyTeam => allyTeam.battlers);
    }

    public addSpectator(spectator: Spectator) : Spectator;
    public addSpectator(spectatorConfig: SpectatorConfig) : Spectator;
    public addSpectator(prop: Spectator | SpectatorConfig) : Spectator {
        if (prop instanceof Spectator && !this.spectators.includes(prop)) {
            this.spectators.push(prop);
            return prop;
        } else {
            const spectator = Spectator.create(this, prop);
            return this.addSpectator(spectator);
        }
    }
}