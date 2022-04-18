import { AllyTeam } from "@/model/battle/ally-team";
import { Player, Bot, Spectator } from "@/model/battle/participants";
import { BattleOptions, Restriction } from "@/model/battle/types";
import { setObject } from "@/utils/set-object";
import { SetOptional } from "type-fest";
import { computed, ComputedRef, reactive } from "vue";

export interface BattleConfig {
    battleOptions: BattleOptions;
    allyTeams: AllyTeam[];
    participants: Array<Player | Bot | Spectator>;
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
}

export class Battle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly allyTeams: AllyTeam[];
    public readonly participants: Array<Player | Bot | Spectator>;
    public readonly gameOptions: Record<string, string | number | boolean>;
    public readonly mapOptions: Record<string, string | number | boolean>;
    public readonly restrictions: Restriction[];

    public readonly me: ComputedRef<Player | Bot | Spectator | undefined>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;

    constructor(config: SetOptional<BattleConfig, "allyTeams" | "gameOptions" | "mapOptions" | "restrictions">) {
        this.battleOptions = reactive(config.battleOptions ?? {});
        this.allyTeams = reactive(config.allyTeams ?? []);
        this.participants = reactive(config.participants ?? []);
        this.gameOptions = reactive(config.gameOptions ?? {});
        this.mapOptions = reactive(config.mapOptions ?? {});
        this.restrictions = reactive(config.restrictions ?? []);

        this.me = computed(() => {
            return this.participants.find((participant): participant is Player | Spectator => "userId" in participant && participant.userId === window.api.session.currentUser.userId);
        });

        this.contenders = computed(() => {
            return this.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot");
        });

        this.spectators = computed(() => {
            return this.participants.filter((participant): participant is Spectator => participant.type === "spectator");
        });
    }

    public set(config: SetOptional<BattleConfig, "allyTeams" | "gameOptions" | "mapOptions" | "restrictions">) {
        setObject(this.battleOptions, config.battleOptions);
        setObject(this.allyTeams, config.allyTeams ?? []);
        setObject(this.participants, config.participants);
        setObject(this.gameOptions, config.gameOptions ?? {});
        setObject(this.mapOptions, config.mapOptions ?? {});
        setObject(this.restrictions, config.restrictions ?? []);
    }

    public addPlayer(player: Omit<Player, "type">) {
        this.participants.push({
            type: "player",
            ...player,
        });

        const allyTeam = this.allyTeams.find(allyTeam => allyTeam.id === player.allyTeamId);
        if (!allyTeam) {
            this.allyTeams.push({
                id: this.allyTeams.length
            });
        }
    }

    public addBot(bot: Omit<SetOptional<Bot, "allyTeamId">, "type">) {
        this.participants.push({
            type: "bot",
            allyTeamId: bot.allyTeamId ?? 0,
            ...bot,
        });

        const allyTeam = this.allyTeams.find(allyTeam => allyTeam.id === bot.allyTeamId);
        if (!allyTeam) {
            this.allyTeams.push({
                id: this.allyTeams.length
            });
        }
    }

    public addSpectator(spectator: Omit<Spectator, "type">) {
        this.participants.push({
            type: "spectator",
            ...spectator,
        });
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        this.participants.splice(this.participants.indexOf(participant), 1);
        if (participant.type !== "spectator") {
            const allyTeam = this.allyTeams.find(allyTeam => allyTeam.id === participant.allyTeamId);
            if (allyTeam && this.getAllyTeamParticipants(allyTeam).length === 0) {
                this.allyTeams.splice(this.allyTeams.indexOf(allyTeam), 1);
            }
        }
    }

    public getAllyTeamParticipants(allyTeamId: number): Array<Player | Bot>;
    public getAllyTeamParticipants(allyTeam: AllyTeam): Array<Player | Bot>;
    public getAllyTeamParticipants(allyTeamObjOrId: number | AllyTeam) : Array<Player | Bot> {
        const allyTeam = typeof allyTeamObjOrId === "number" ? this.allyTeams.find(allyTeam => allyTeam.id === allyTeamObjOrId) : allyTeamObjOrId;
        if (allyTeam) {
            return this.contenders.value.filter(contender => contender.allyTeamId === allyTeam.id);
        }
        return [];
    }
}