import { AbstractBattleInterface } from "@/api/battle/abstract-battle-interface";

export class TachyonSpadsBattleInterface extends AbstractBattleInterface {
    public changeMap(map: string) {
        api.comms.request("c.lobby.message", {
            message: `!cv map ${map}`,
        });
    }

    public say(message: string) {
        api.comms.request("c.lobby.message", {
            message,
        });
    }
}
