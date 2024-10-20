import Password from "@renderer/components/prompts/Password.vue";
import { Battle } from "@renderer/game/battle";

export async function attemptJoinBattle(battle: Battle) {
    if (battle.battleOptions.passworded) {
        const data = await api.prompt({
            title: "Battle Password",
            component: Password,
        });

        if (data?.password) {
            const response = await api.comms.request("c.lobby.join", {
                lobby_id: battle.battleOptions.id,
                password: data.password,
            });

            if (response.result === "failure" && response.reason) {
                api.notifications.alert({
                    text: response.reason,
                });
            }
        }
    } else {
        if (api.session.onlineBattle.value) {
            await api.comms.request("c.lobby.leave");
        }
        await api.comms.request("c.lobby.join", {
            lobby_id: battle.battleOptions.id,
        });
    }
}
