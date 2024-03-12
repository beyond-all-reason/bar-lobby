import Password from "@/components/prompts/Password.vue";
import { OnlineCustomBattle } from "@/model/battle/online-custom-battle";

export async function attemptJoinBattle(battle: OnlineCustomBattle) {
    if (battle.battleOptions.passworded) {
        const data = await api.prompt({
            title: "Battle Password",
            component: Password,
        });

        if (data?.password) {
            // TODO
            // const response = await api.comms.request("c.lobby.join", {
            //     lobby_id: battle.battleOptions.id,
            //     password: data.password,
            // });
            // if (response.result === "failure" && response.reason) {
            //     api.notifications.alert({
            //         text: response.reason,
            //     });
            // }
        }
    } else {
        // TODO
        // if (api.session.onlineBattle.value) {
        //     await api.comms.request("c.lobby.leave");
        // }
        // await api.comms.request("c.lobby.join", {
        //     lobby_id: battle.battleOptions.id,
        // });
    }
}
