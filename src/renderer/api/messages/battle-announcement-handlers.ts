import { Type } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";

import { createMessageHandlers } from "@/model/messages";

export const battleAnnouncementHandlers = createMessageHandlers(
    {
        // * BarManager|{"BattleStateChanged": {"locked": "unlocked", "autoBalance": "advanced", "teamSize": "8", "nbTeams": "2", "balanceMode": "clan;skill", "preset": "team"}}
        // * BarManager|{"onVoteStart": {"user": "ohmegaherz", "command": ["resign", "ohmegaherz", "TEAM"]}}
        regex: new RegExp(/\* BarManager\|(?<jsonStr>.*)/),
        schema: Type.Object({
            jsonStr: Type.String(),
        }),
        async handler(data, message) {
            message.hide = true;

            const obj: Record<string, string> = JSON.parse(data.jsonStr);

            return api.messages.handleBarManagerMessage(obj, message);
        },
    },
    {
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
        regex: new RegExp(/\* (?<username>.*) called a vote for command "(?<command>.*)"/),
        schema: Type.Object({
            username: Type.String(),
            command: Type.String(),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value;
            if (!battle) {
                console.error(`Received announcement from unknown battle`, data);
                return;
            }

            battle.currentVote.value = {
                command: data.command,
                callerName: data.username,
            };
        },
    },
    {
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

            if (battle.currentVote.value) {
                assign(battle.currentVote.value, data);
            } else {
                battle.currentVote.value = data;
            }

            message.hide = true;
        },
    },
    {
        regex: new RegExp(/\* Vote for command "(?<command>.*)" passed./),
        schema: Type.Object({
            command: Type.String(),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value!;
            battle.currentVote.value = null;
        },
    },
    {
        regex: new RegExp(/\* Vote for command "(?<command>.*)" failed(?: \(delay expired, away vote mode activated for (?<awayCount>\d*) users\))?./),
        schema: Type.Object({
            command: Type.String(),
            awayCount: Type.Optional(Type.Number()),
        }),
        async handler(data, message) {
            const battle = api.session.onlineBattle.value!;
            battle.currentVote.value = null;
        },
    },
    {
        regex: new RegExp(/\* (?<numOfUsersAllowedToVote>\d*) users allowed to vote./),
        schema: Type.Object({
            numOfUsersAllowedToVote: Type.Number(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/\* (?<username>.*), you have already voted for current vote./),
        schema: Type.Object({
            username: Type.String(),
        }),
        async handler(data, message) {
            message.hide = data.username !== api.session.onlineUser.username;
        },
    },
    {
        regex: new RegExp(/\* Awaiting following vote\(s\):/),
        schema: Type.Object({}),
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
        regex: new RegExp(/\* Awaiting following vote\(s\):/),
        schema: Type.Object({}),
        async handler(data, message) {
            message.hide = true;
        },
    }
);
