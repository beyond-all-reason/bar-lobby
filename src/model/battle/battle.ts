import { Team } from "@/model/battle/team";
import { Player, Bot, Spectator } from "@/model/battle/participants";
import { BattleOptions, Restriction } from "@/model/battle/types";
import { setObject } from "@/utils/set-object";
import { SetOptional } from "type-fest";
import { computed, ComputedRef, reactive } from "vue";

export interface BattleConfig {
    battleOptions: BattleOptions;
    teams: Team[];
    participants: Array<Player | Bot | Spectator>;
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
}

export class Battle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly teams: Team[];
    public readonly participants: Array<Player | Bot | Spectator>;
    public readonly gameOptions: Record<string, string | number | boolean>;
    public readonly mapOptions: Record<string, string | number | boolean>;
    public readonly restrictions: Restriction[];

    public readonly me: ComputedRef<Player | Spectator>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;
    public readonly battleUsers: ComputedRef<Array<Player | Spectator>>;

    protected participantProxyHandler: ProxyHandler<Player | Bot | Spectator>;

    constructor(config: SetOptional<BattleConfig, "teams" | "gameOptions" | "mapOptions" | "restrictions">) {
        this.battleOptions = reactive(config.battleOptions ?? {});
        this.teams = reactive(config.teams ?? []);
        this.participants = reactive([]);
        this.gameOptions = reactive(config.gameOptions ?? {});
        this.mapOptions = reactive(config.mapOptions ?? {});
        this.restrictions = reactive(config.restrictions ?? []);

        this.participantProxyHandler = {
            set: (target, prop, value, receiver) => {
                Reflect.set(target, prop, value, receiver);
                this.fixParticipants();
                return true;
            }
        };

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }

        this.me = computed(() => this.participants.find((participant): participant is Player | Spectator => "userId" in participant && participant.userId === api.session.currentUser.userId)!);
        this.contenders = computed(() => this.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot"));
        this.spectators = computed(() => this.participants.filter((participant): participant is Spectator => participant.type === "spectator"));
        this.battleUsers = computed(() => this.participants.filter((participant): participant is Player | Spectator => participant.type === "spectator" || participant.type === "player"));
    }

    public set(config: SetOptional<BattleConfig, "teams" | "gameOptions" | "mapOptions" | "restrictions">) {
        setObject(this.battleOptions, config.battleOptions);
        setObject(this.participants, []);
        setObject(this.teams, config.teams ?? []);
        setObject(this.gameOptions, config.gameOptions ?? {});
        setObject(this.mapOptions, config.mapOptions ?? {});
        setObject(this.restrictions, config.restrictions ?? []);

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }
    }

    public addParticipant(participantConfig: Player | Bot | Spectator) {
        const participant = new Proxy(participantConfig, this.participantProxyHandler);

        this.participants.push(participant);

        if (participant.type !== "spectator") {
            const team = this.teams.find(allyTeam => allyTeam.id === participant.teamId);
            if (!team) {
                this.teams.push({
                    id: this.teams.length
                });
            }
        }
    }

    public playerToSpectator(player: Player) {
        this.removeParticipant(player);
        this.addParticipant({
            type: "spectator",
            userId: player.userId
        });
        this.fixParticipants();
    }

    public spectatorToPlayer(spectator: Spectator, teamId?: number) {
        this.removeParticipant(spectator);
        this.addParticipant({
            id: this.contenders.value.length,
            type: "player",
            userId: spectator.userId,
            teamId: teamId ?? 0
        });
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        this.participants.splice(this.participants.indexOf(participant), 1);
        this.fixParticipants();
    }

    public addTeam() {
        this.teams.push({
            id: this.teams.length
        });
        this.fixTeams();
    }

    public removeTeam(teamId: number) {
        this.teams.splice(teamId, 1);
        this.fixTeams();
        this.fixParticipants();
    }

    public getTeamParticipants(teamId: number): Array<Player | Bot>;
    public getTeamParticipants(team: Team): Array<Player | Bot>;
    public getTeamParticipants(teamObjOrId: number | Team) : Array<Player | Bot> {
        const team = typeof teamObjOrId === "number" ? this.teams.find(team => team.id === teamObjOrId) : teamObjOrId;
        if (team) {
            return this.contenders.value.filter(contender => contender.teamId === team.id);
        }
        return [];
    }

    protected fixTeams() {
        this.teams.sort((a, b) => a.id - b.id);

        for (let i=0; i<this.teams.length; i++) {
            this.teams[i].id = i;
        }
    }

    protected fixParticipants() {
        this.participants.sort((a, b) => {
            if (a.type === "spectator") {
                return -1;
            }
            if (b.type === "spectator") {
                return 1;
            }
            return a.id - b.id;
        });

        const contenders = this.contenders.value;
        contenders.forEach((contender, i) => {
            contender.id = i;
        });
    }
}