import { Type } from "@sinclair/typebox";

import { createMessageHandlers } from "@/model/messages";

export const directMessageHandlers = createMessageHandlers({
    // Starting a new private instance in team cluster (name=[teh]cluster1[04], password=6f7c)
    regex: new RegExp(/Starting a new private instance in (?<clusterType>.*) cluster \(name=(?<autohostName>.*), password=(?<password>.*)\)/),
    schema: Type.Object({
        clusterType: Type.String(),
        autohostName: Type.String(),
        password: Type.String(),
    }),
    async handler(data, message) {
        message.hide = true;

        console.log(data);

        // if (data.sender_id !== targetClusterBotUserId) {
        //     return;
        // }

        // try {
        //     const { name, password } = data.message.match(/name=(?<name>.*)?,\spassword=(?<password>.*)?\)/)!.groups!;
        //     hostedBattleData.value = { name, password };
        // } catch (err) {
        //     console.error(`Error parsing autohost response: ${data.message}`);
        //     return;
        // }

        // // TODO: when we move away from polling lobby.query then this should be changed to listen for newly created battles
        // battleOpenedBinding = api.comms.onResponse("s.lobby.query").add((data) => {
        //     if (hostedBattleData.value === undefined) {
        //         console.warn("Listening for a battle to open but no hosted battle data is set");
        //         return;
        //     }

        //     const autohostUser = api.session.getUserByName(hostedBattleData.value.name);

        //     if (!autohostUser) {
        //         console.warn(`Listening for a battle but could not find user data for the autohost user: ${hostedBattleData.value.name}`);
        //         return;
        //     }

        //     for (const battle of data.lobbies) {
        //         if (battle.lobby.founder_id === autohostUser.userId) {
        //             battleOpenedBinding?.destroy();

        //             api.comms.request("c.lobby.join", {
        //                 lobby_id: battle.lobby.id,
        //                 password: hostedBattleData.value.password,
        //             });

        //             return;
        //         }
        //     }
        // });
    },
});
