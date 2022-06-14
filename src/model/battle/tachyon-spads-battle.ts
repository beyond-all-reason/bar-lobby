import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";

export class TachyonSpadsBattle extends AbstractBattle {
    public changeMap(map: string) {
        console.log(`Online Changing map to ${map}`);
        // api.comms.request("c.lobby.message", {
        //     message: `!cv map ${map}`,
        // });
    }

    public updateParticipant(name: string, updatedProperties: Partial<Player | Bot | Spectator>) {
        // TODO
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }
}
