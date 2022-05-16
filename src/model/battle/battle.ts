import { Team } from "@/model/battle/team";
import { Player, Bot, Spectator } from "@/model/battle/participants";
import { BattleOptions, StartBox, StartPosType, TeamPreset } from "@/model/battle/types";
import { setObject } from "@/utils/set-object";
import { SetOptional } from "type-fest";
import { computed, ComputedRef, reactive } from "vue";
import { TypedProxyHandler } from "@/utils/typed-proxy-handler";
import { defaultMapBoxes } from "@/config/default-boxes";

export interface BattleConfig {
    battleOptions: BattleOptions;
    teams: Team[];
    participants: Array<Player | Bot | Spectator>;
}

export class Battle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly teams: Team[];
    public readonly participants: Array<Player | Bot | Spectator>;
    public readonly startBoxes: StartBox[];

    public readonly teamPreset: ComputedRef<TeamPreset>;
    public readonly me: ComputedRef<Player | Spectator>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;
    public readonly battleUsers: ComputedRef<Array<Player | Spectator>>;

    protected battleOptionsProxyHandler: TypedProxyHandler<BattleOptions>;
    protected teamProxyHandler: TypedProxyHandler<Team>;
    protected participantProxyHandler: TypedProxyHandler<Player | Bot | Spectator>;

    constructor(config: SetOptional<BattleConfig, "teams">) {
        this.teams = reactive(config.teams ?? []);
        this.participants = reactive([]);
        this.startBoxes = reactive([]);

        this.battleOptionsProxyHandler = {
            set: (target, prop, value, receiver) => {
                // if (prop === "teamPreset") {
                //     this.configureTeams(value as TeamPreset);
                //     this.fixIds();
                // } else if (prop === "mapFileName" && this.battleOptions.offline) {
                if (prop === "mapFileName" && this.battleOptions.offline) {
                    this.setBoxes(value as string);
                }
                return Reflect.set(target, prop, value, receiver);
            }
        };
        this.battleOptions = reactive(new Proxy(config.battleOptions ?? {}, this.battleOptionsProxyHandler));

        this.teamProxyHandler = {
            set: (target, prop, value, receiver) => {
                return Reflect.set(target, prop, value, receiver);
            }
        };

        this.participantProxyHandler = {
            set: (target, prop: keyof Player & keyof Bot, value, receiver) => {
                return Reflect.set(target, prop, value, receiver);
            }
        };

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }

        // this should eventually be a real, required property, but needs supporting on server and autohosts
        this.teamPreset = computed(() => {
            if (this.teams.length === 1) {
                
            } else if (this.teams.length === 2) {
                return TeamPreset.Standard;
            } else if (this.teams.length > 2) {
                // TODO
            }
            return TeamPreset.Custom;
        });

        this.me = computed(() => this.participants.find((participant): participant is Player | Spectator => "userId" in participant && participant.userId === api.session.currentUser.userId)!);
        this.contenders = computed(() => this.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot"));
        this.spectators = computed(() => this.participants.filter((participant): participant is Spectator => participant.type === "spectator"));
        this.battleUsers = computed(() => this.participants.filter((participant): participant is Player | Spectator => participant.type === "spectator" || participant.type === "player"));
    }

    public set(config: SetOptional<BattleConfig, "teams">) {
        setObject(this.battleOptions, config.battleOptions);
        setObject(this.participants, []);
        setObject(this.teams, config.teams ?? []);

        for (const participant of config.participants) {
            this.addParticipant(participant);
        }

        this.setBoxes(this.battleOptions.mapFileName);
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

    protected setBoxes(mapFileName: string) {
        if (this.battleOptions.startPosType === StartPosType.Boxes) {
            const boxes: StartBox[] | undefined = defaultMapBoxes[mapFileName];
            if (boxes) {
                this.teams[0].startBox = boxes[0];
                this.teams[1].startBox = boxes[1];
            } else {
                this.teams[0].startBox = { xPercent: 0, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
                this.teams[1].startBox = { xPercent: 0.75, yPercent: 0, widthPercent: 0.25, heightPercent: 1 };
            }
        }
    }

    // protected configureTeams(teamPreset: TeamPreset) {
    //     if (teamPreset === TeamPreset.Standard) {
    //         this.teams.length = 2;
    //         this.battleOptions.startPosType = StartPosType.Boxes;
    //     } else if (teamPreset === TeamPreset.FFA) {
    //         this.teams.length = this.participants.length;
    //         this.battleOptions.startPosType = StartPosType.Fixed; // TODO: should be random?
    //     } else if (teamPreset === TeamPreset.TeamFFA) {
    //         this.battleOptions.startPosType = StartPosType.Fixed;
    //     }
    // }
}