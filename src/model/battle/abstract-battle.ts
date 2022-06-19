import { groupBy } from "jaz-ts-utils";
import { computed, ComputedRef, reactive } from "vue";

import { Bot, Player, Spectator } from "@/model/battle/participants";
import { BattleOptions } from "@/model/battle/types";

export interface BattleConfig {
    battleOptions: BattleOptions;
    participants: Array<Player | Bot | Spectator>;
}

export abstract class AbstractBattle implements BattleConfig {
    public readonly battleOptions: BattleOptions;
    public readonly participants: Array<Player | Bot | Spectator>;

    // helpers
    public readonly numOfTeams: ComputedRef<number>;
    public readonly teams: ComputedRef<Map<number, Array<Player | Bot>>>;
    public readonly me: ComputedRef<Player | Spectator | undefined>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;
    public readonly battleUsers: ComputedRef<Array<Player | Spectator>>;

    constructor(config: BattleConfig) {
        this.battleOptions = reactive(config.battleOptions);
        this.participants = reactive(config.participants);

        this.numOfTeams = computed(() => new Set(this.contenders.value.map((contentender) => contentender.teamId)).size);
        this.teams = computed(() => groupBy(this.contenders.value, (player) => player.teamId));
        this.me = computed(() => this.participants.find((participant): participant is Player | Spectator => "userId" in participant && participant.userId === api.session.currentUser.userId));
        this.contenders = computed(() => this.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot"));
        this.spectators = computed(() => this.participants.filter((participant): participant is Spectator => participant.type === "spectator"));
        this.battleUsers = computed(() => this.participants.filter((participant): participant is Player | Spectator => participant.type === "spectator" || participant.type === "player"));
    }

    public getTeamParticipants(teamId: number): Array<Player | Bot> {
        return this.contenders.value.filter((contender) => contender.teamId === teamId);
    }

    public getParticipantByName(name: string): Player | Bot | Spectator | undefined {
        return this.participants.find((participant) => {
            const isBot = participant.type === "bot";
            if (isBot) {
                if (participant.name === name) {
                    return true;
                }
            } else {
                if (api.session.getUserById(participant.userId)?.username === name) {
                    return true;
                }
            }
            return false;
        });
    }

    public abstract changeMap(map: string): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract setGameOptions(options: Record<string, any>): void;
    public abstract setBotOptions(botName: string, options: Record<string, any>): void;
    public abstract addParticipant(participant: Player | Bot | Spectator): void;
    public abstract removeParticipant(participant: Player | Bot | Spectator): void;
    public abstract playerToSpectator(player: Player): void;
    public abstract spectatorToPlayer(spectator: Spectator, teamId: number): void;
    public abstract changeContenderTeam(contender: Player | Bot, teamId: number): void;
}
