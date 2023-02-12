import { Type } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";

import { createMessageHandlers } from "@/model/messages";
import { SpadsVote } from "@/model/spads/spads-types";

export const battleAnnouncementHandlers = createMessageHandlers(
    {
        // * Hi jaztest1! Current battle type is team.
        regex: new RegExp(/\* Hi (?<username>.*)! Current battle type is (?<preset>.*)\./),
        schema: Type.Object({
            username: Type.String(),
            preset: Type.String(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/\* Adding user (?<username>.*) as spectator/),
        schema: Type.Object({
            username: Type.String(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        // * jaztest1 called a vote for command "start" [!vote y, !vote n, !vote b]
        regex: new RegExp(/\* (?<username>.*) called a vote for command "(?<command>.*)"/),
        schema: Type.Object({
            username: Type.String(),
            command: Type.String(),
        }),
    },
    {
        // * Vote in progress: "start" [y:4/8, n:0/7] (40s remaining)
        // * Vote in progress: "set map Tempest_V3" [y:2/6(9), n:0/6(8)] (25s remaining)
        regex: new RegExp(
            /\* Vote in progress: "(?<command>.*?)" \[y:(?<yesVotes>\d*)\/(?<requiredYesVotes>\d*)(?:\((?<maxYesVotes>\d*)\))?, n:(?<noVotes>\d*)\/(?<requiredNoVotes>\d*)(?:\((?<maxNoVotes>\d*)\))?] \((?<secondsRemaining>\d*)s.*/
        ),
        schema: Type.Object({
            command: Type.String(),
            yesVotes: Type.Number(),
            requiredYesVotes: Type.Number(),
            maxYesVotes: Type.Optional(Type.Number()),
            noVotes: Type.Number(),
            requiredNoVotes: Type.Number(),
            maxNoVotes: Type.Optional(Type.Number()),
            secondsRemaining: Type.Number(),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value;
            if (!battle) {
                console.error(`Received announcement from unknown battle`, data);
                return;
            }

            const vote: SpadsVote = data;

            if (battle.currentVote.value) {
                assign(battle.currentVote.value, vote);
            } else {
                battle.currentVote.value = vote;
            }

            message.hide = true;
        },
    },
    {
        // * Vote for command "start" passed.
        regex: new RegExp(/\* Vote for command "(?<command>.*)" passed./),
        schema: Type.Object({
            command: Type.String(),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value;
            if (!battle) {
                console.error(`Received announcement from unknown battle`, data);
                return;
            }

            battle.currentVote.value = null;
        },
    },
    {
        // * Vote for command "lock" failed (delay expired, away vote mode activated for 7 users).
        // * Vote for command "resign jaztest1 TEAM" failed.
        regex: new RegExp(/\* Vote for command "(?<command>.*)" failed(?: \(delay expired, away vote mode activated for (?<awayCount>\d*) users\))?./),
        schema: Type.Object({
            command: Type.String(),
            awayCount: Type.Optional(Type.Number()),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value;
            if (!battle) {
                console.error(`Received announcement from unknown battle`, data);
                return;
            }

            battle.currentVote.value = null;
        },
    },
    {
        // * BarManager|{"BattleStateChanged": {"locked": "unlocked", "autoBalance": "advanced", "teamSize": "8", "nbTeams": "2", "balanceMode": "clan;skill", "preset": "team"}}
        regex: new RegExp(/\* BarManager\|{"BattleStateChanged": (?<json>.*)\}/),
        schema: Type.Object({
            json: Type.String(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        // * 13 users allowed to vote.
        regex: new RegExp(/\* (?<numOfUsersAllowedToVote>\d*) users allowed to vote./),
        schema: Type.Object({
            numOfUsersAllowedToVote: Type.Number(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        // * lamancha, you have already voted for current vote.
        regex: new RegExp(/\* (?<username>.*), you have already voted for current vote./),
        schema: Type.Object({
            username: Type.Number(),
        }),
    }
);
