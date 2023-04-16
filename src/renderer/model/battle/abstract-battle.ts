import { useNow } from "@vueuse/core";
import { formatDuration } from "date-fns";
import { groupBy } from "jaz-ts-utils";
import { computed, ComputedRef, reactive, shallowReactive, watch, WatchStopHandle } from "vue";

import { BattleOptions, Bot, StartPosType } from "@/model/battle/battle-types";
import { MapData } from "@/model/cache/map-data";
import { User } from "@/model/user";
import { StartBoxOrientation } from "@/utils/start-boxes";

export interface BattleConfig<T extends BattleOptions = BattleOptions> {
    battleOptions: T;
    bots: Bot[];
    users: User[];
}

export abstract class AbstractBattle<T extends BattleOptions = BattleOptions> {
    public readonly battleOptions: T;
    public readonly bots: Bot[];
    public readonly users: User[];

    // helpers
    public readonly participants: ComputedRef<Array<User | Bot>>;
    public readonly contenders: ComputedRef<Array<User | Bot>>;
    public readonly players: ComputedRef<Array<User>>;
    public readonly spectators: ComputedRef<Array<User>>;
    public readonly teams: ComputedRef<Map<number, Array<User | Bot>>>;
    public readonly friendlyRuntime: ComputedRef<string | null>;
    public readonly runtimeMs: ComputedRef<number | null>;
    public readonly map: ComputedRef<MapData | undefined>;
    public readonly playerCount: ComputedRef<number>;

    protected watchStopHandles: WatchStopHandle[] = [];

    constructor(config: BattleConfig<T>) {
        this.battleOptions = reactive(config.battleOptions) as T;
        this.bots = reactive(config.bots);
        this.users = shallowReactive(config.users); // users are already reactive, so making them doubly reactive here will cause bugs

        this.participants = computed(() => [...this.users, ...this.bots]);
        this.contenders = computed(() => this.participants.value.filter((participant) => ("userId" in participant ? !participant.battleStatus.isSpectator : true)));
        this.players = computed(() => this.users.filter((user) => !user.battleStatus.isSpectator));
        this.spectators = computed(() => this.users.filter((user) => user.battleStatus.isSpectator));
        this.teams = computed(() => {
            const teams = groupBy(this.contenders.value, (player) => ("userId" in player ? player.battleStatus.teamId : player.teamId));
            const sortedTeams = new Map([...teams.entries()].sort());
            return sortedTeams;
        });
        this.runtimeMs = computed(() => {
            if (!this.battleOptions.startTime) {
                return null;
            }
            const ms = useNow({ interval: 1000 }).value.getTime() - this.battleOptions.startTime.getTime();
            return ms;
        });
        this.friendlyRuntime = computed(() => {
            if (!this.battleOptions.startTime) {
                return null;
            }
            const ms = useNow({ interval: 1000 }).value.getTime() - this.battleOptions.startTime.getTime();
            const runtimeDate = new Date(ms);
            const hours = runtimeDate.getHours() - 1;
            const minutes = runtimeDate.getMinutes();
            const seconds = runtimeDate.getSeconds();
            return `Running for ${formatDuration({ hours, minutes, seconds })}`;
        });
        this.map = computed(() => api.content.maps.installedVersions.find((map) => map.scriptName === this.battleOptions.map));
        this.playerCount = computed(() => {
            return this.players.value.length + this.spectators.value.length;
        });
    }

    public getTeamParticipants(teamId: number): Array<User | Bot> {
        return this.contenders.value.filter((contender) => ("userId" in contender ? contender.battleStatus.teamId === teamId : contender.teamId === teamId));
    }

    public getParticipantByName(name: string): User | Bot | undefined {
        return this.participants.value.find((participant) => {
            const isBot = !("userId" in participant);
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

    public open() {
        this.watchStopHandles = [
            watch(
                () => this.battleOptions.engineVersion,
                (engineVersion) => {
                    api.content.engine.downloadEngine(engineVersion);
                },
                {
                    immediate: true,
                }
            ),
            watch(
                () => this.battleOptions.gameVersion,
                (gameVersion) => {
                    api.content.game.downloadGame(gameVersion);
                },
                {
                    immediate: true,
                }
            ),
            watch(
                () => this.battleOptions.map,
                (mapScriptName) => {
                    api.content.maps.downloadMaps(mapScriptName);
                },
                {
                    immediate: true,
                }
            ),
        ];
    }

    public leave() {
        for (const stopWatchHandle of this.watchStopHandles) {
            stopWatchHandle();
        }
    }

    public abstract start(): void;
    public abstract setMap(map: string): void;
    public abstract setGame(gameVersion: string): void;
    public abstract setEngine(engineVersion: string): void;
    public abstract setStartPosType(startPosType: StartPosType): void;
    public abstract setStartBoxes(orientation: StartBoxOrientation, size: number): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract setGameOptions(options: Record<string, any>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract setBotOptions(botName: string, options: Record<string, any>): void;
    public abstract addBot(bot: Bot): void;
    public abstract removeBot(bot: Bot): void;
    public abstract playerToSpectator(player: User): void;
    public abstract spectatorToPlayer(spectator: User, teamId: number): void;
    public abstract setContenderTeam(contender: User | Bot, teamId: number): void;
}
