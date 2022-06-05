import { AbstractBattle } from "@/model/battle/abstract-battle";

export class TachyonSpadsBattle extends AbstractBattle {
    public changeMap(map: string) {
        console.log(`Online Changing map to ${map}`);
        // api.comms.request("c.lobby.message", {
        //     message: `!cv map ${map}`,
        // });
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }
}
