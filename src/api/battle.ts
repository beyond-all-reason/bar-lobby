import { defaultBattle } from "@/config/default-battle";
import { AllyTeam } from "@/model/battle/ally-team";
import { Battle } from "@/model/battle/battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { createDeepProxy } from "jaz-ts-utils";
import { SetOptional } from "type-fest";
import { Ref, ref, reactive, ComputedRef, computed } from "vue";

export class BattleAPI {
    public readonly inBattle: Ref<boolean>;
    public readonly currentBattle: Battle;
    public readonly me: ComputedRef<Player | Bot | Spectator | undefined>;
    public readonly contenders: ComputedRef<Array<Player | Bot>>;
    public readonly spectators: ComputedRef<Array<Spectator>>;

    constructor() {
        this.inBattle = ref(false);

        this.currentBattle = reactive(createDeepProxy(defaultBattle(), (breadcrumb) => {
            const currentBattle = this.currentBattle;

            return {
                get(target, prop) {
                    return target[prop as keyof typeof target];
                },
                set(target, prop, value) {
                    if (currentBattle.battleOptions.offline) {
                        target[prop as keyof typeof target] = value;
                    } else {
                        // TODO: if set from server data then immediately apply
                        // TODO: if set from client then send server request for it
                        console.warn("can't set battle property directly");
                    }
                    return true;
                }
            };
        }, "battle"));

        this.me = computed(() => {
            return this.currentBattle.participants.find(participant => "userId" in participant && participant.userId === window.api.session.currentUser.userId);
        });

        this.contenders = computed(() => {
            return this.currentBattle.participants.filter((participant): participant is Player | Bot => participant.type === "player" || participant.type === "bot");
        });

        this.spectators = computed(() => {
            return this.currentBattle.participants.filter((participant): participant is Spectator => participant.type === "spectator");
        });
    }

    public setCurrentBattle(battle: Battle) {
        // // set properties on the battle object instead of reassigning it to keep the reactivity intact
        // const currentBattle = this.currentBattle;
        // objectKeys(this.currentBattle).forEach(key => {
        //     delete currentBattle[key];
        // });
        Object.assign(this.currentBattle, battle);

        this.inBattle.value = true;
    }

    public leaveCurrentbattle() {
        this.inBattle.value = false;
    }

    // public getParticipantByName(name: string) : Player | Bot | Spectator | null {
    //     for (const participant of this.currentBattle.participants) {
    //         if ("userId" in participant) {
    //             const user = window.api.session.getUserById(participant.userId);
    //             if (user?.username === name) {
    //                 return participant;
    //             }
    //         } else {
    //             if (participant.name === name) {
    //                 return participant;
    //             }
    //         }
    //     }
    //     return null;
    // }

    public addPlayer(player: Omit<Player, "type">) {
        this.currentBattle.participants.push({
            type: "player",
            ...player,
        });

        const allyTeam = this.currentBattle.allyTeams.find(allyTeam => allyTeam.id === player.allyTeamId);
        if (!allyTeam) {
            this.currentBattle.allyTeams.push({
                id: this.currentBattle.allyTeams.length
            });
        }
    }

    public addBot(bot: Omit<SetOptional<Bot, "allyTeamId">, "type">) {
        this.currentBattle.participants.push({
            type: "bot",
            allyTeamId: bot.allyTeamId ?? 0,
            ...bot,
        });

        const allyTeam = this.currentBattle.allyTeams.find(allyTeam => allyTeam.id === bot.allyTeamId);
        if (!allyTeam) {
            this.currentBattle.allyTeams.push({
                id: this.currentBattle.allyTeams.length
            });
        }
    }

    public addSpectator(spectator: Omit<Spectator, "type">) {
        this.currentBattle.participants.push({
            type: "spectator",
            ...spectator,
        });
    }

    public removeParticipant(participant: Player | Bot | Spectator) {
        this.currentBattle.participants.splice(this.currentBattle.participants.indexOf(participant), 1);
        if (participant.type !== "spectator") {
            const allyTeam = this.currentBattle.allyTeams.find(allyTeam => allyTeam.id === participant.allyTeamId);
            if (allyTeam && this.getAllyTeamParticipants(allyTeam).length === 0) {
                this.currentBattle.allyTeams.splice(this.currentBattle.allyTeams.indexOf(allyTeam), 1);
            }
        }
    }

    public getAllyTeamParticipants(allyTeamId: number): Array<Player | Bot>;
    public getAllyTeamParticipants(allyTeam: AllyTeam): Array<Player | Bot>;
    public getAllyTeamParticipants(allyTeamObjOrId: number | AllyTeam) : Array<Player | Bot> {
        const allyTeam = typeof allyTeamObjOrId === "number" ? this.currentBattle.allyTeams.find(allyTeam => allyTeam.id === allyTeamObjOrId) : allyTeamObjOrId;
        if (allyTeam) {
            return this.contenders.value.filter(contender => contender.allyTeamId === allyTeam.id);
        }
        return [];
    }
}