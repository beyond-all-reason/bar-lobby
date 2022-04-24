import { Team } from "@/model/battle/team";
import { Player, Bot, Spectator } from "@/model/battle/participants";
import { BattleOptions, Restriction, TeamPreset } from "@/model/battle/types";
import { setObject } from "@/utils/set-object";
import { SetOptional } from "type-fest";
import { computed, ComputedRef, reactive } from "vue";
import { TypedProxyHandler } from "@/utils/typed-proxy-handler";

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

    protected battleOptionsProxyHandler: TypedProxyHandler<BattleOptions>;
    protected participantProxyHandler: TypedProxyHandler<Player | Bot | Spectator>;

    constructor(config: SetOptional<BattleConfig, "teams" | "gameOptions" | "mapOptions" | "restrictions">) {
        this.teams = reactive(config.teams ?? []);
        this.participants = reactive([]);
        this.gameOptions = reactive(config.gameOptions ?? {});
        this.mapOptions = reactive(config.mapOptions ?? {});
        this.restrictions = reactive(config.restrictions ?? []);

        this.battleOptionsProxyHandler = {
            set: (target, prop, value, receiver) => {
                if (prop === "teamPreset") {
                    if (value === TeamPreset.Standard) { // only 2 teams
                        this.teams.length = 2;
                    } else if (value === TeamPreset.FFA) { // 1 big team for all players, but separate team for each player when converted to start script
                        this.teams.length = 1;
                    } else { // anything goes

                    }
                    this.fixIds();
                }
                return Reflect.set(target, prop, value, receiver);
            }
        };

        this.battleOptions = reactive(new Proxy(config.battleOptions ?? {}, this.battleOptionsProxyHandler));

        this.participantProxyHandler = {
            set: (target, prop: keyof Player & keyof Bot, value, receiver) => {
                Reflect.set(target, prop, value, receiver);
                // if ((target.type === "player" || target.type === "bot") && prop === "teamId") {
                //     this.fixTeams();
                // } else if ((target.type === "player" || target.type === "bot") && prop === "id") {
                //     this.fixParticipants();
                // }
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
    }

    public playerToSpectator(player: Player) {
        this.removeParticipant(player);
        this.addParticipant({
            type: "spectator",
            userId: player.userId
        });
        this.fixIds();
    }

    public spectatorToPlayer(spectator: Spectator, team: Team) {
        this.removeParticipant(spectator);
        this.addParticipant({
            id: this.contenders.value.length,
            type: "player",
            userId: spectator.userId,
            team
        });
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        this.participants.splice(this.participants.indexOf(participant), 1);
        this.fixIds();
    }

    public addTeam() {
        this.teams.push({});
        this.fixIds();
    }

    public removeTeam(team: Team) {
        this.teams.splice(this.teams.indexOf(team), 1);
        this.fixIds();
    }

    public getTeamParticipants(team: Team): Array<Player | Bot> {
        return this.contenders.value.filter(contender => contender.team === team);
    }

    protected fixIds() {
        this.participants.sort((a, b) => {
            if (a.type === "spectator") {
                return -1;
            }
            if (b.type === "spectator") {
                return 1;
            }
            return a.id - b.id;
        });

        for (const contender of this.contenders.value) {
            if (!this.teams.includes(contender.team)) {
                contender.team = this.teams[0];
            }
        }
    }
}