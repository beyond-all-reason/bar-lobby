import { Type } from "@sinclair/typebox";

import { createMessageHandlers } from "@/model/messages";

export const barManagerHandlers = createMessageHandlers(
    {
        regex: new RegExp(/BattleStateChanged/),
        schema: Type.Object({
            locked: Type.String(),
            autoBalance: Type.String(),
            teamSize: Type.Number(),
            nbTeams: Type.Number(),
            balanceMode: Type.String(),
            preset: Type.String(),
        }),
        async handler(data) {
            const battle = api.session.onlineBattle.value!;

            battle.battleOptions.locked = data.locked === "locked";
            battle.battleOptions.autoBalance = data.autoBalance;
            battle.battleOptions.teamSize = data.teamSize;
            battle.battleOptions.nbTeams = data.nbTeams;
            battle.battleOptions.balanceMode = data.balanceMode;
            battle.battleOptions.preset = data.preset;
        },
    },
    {
        regex: new RegExp(/onVoteStart/),
        schema: Type.Object({
            user: Type.String(),
            command: Type.Array(Type.String()),
        }),
        async handler(data) {
            // parsing from the normal spads vote announcement instead
        },
    }
);
