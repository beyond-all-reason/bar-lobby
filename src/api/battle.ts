import { AIPlayer, BattleType, Player } from "@/model/battle";
import { reactive } from "vue";

export class BattleAPI {
    protected battle?: BattleType;

    public newBattle(battle: BattleType) {
        this.battle = reactive(battle);

        if (!this.battle.allyTeams) {
            this.battle.allyTeams = [];
        }
    }

    public getBattle() {
        return this.battle;
    }

    public addPlayer(player: Player | AIPlayer, teamId: number, allyId: number) {
        if (!this.battle) {
            throw new Error("No battle loaded");
        }

        if (!this.battle.allyTeams[allyId]) {
            this.battle.allyTeams[allyId] = {
                teams: []
            };
        }

        if (!this.battle.allyTeams[allyId].teams[teamId]) {
            this.battle.allyTeams[allyId].teams[teamId] = {
                players: [ player ]
            };
        } else {
            this.battle.allyTeams[allyId].teams[teamId].players.push(player);
        }
    }

    // public async defaultBattle() : Battle {
    //     return {
    //         battleOptions: {

    //         }
    //     }
    // }
}