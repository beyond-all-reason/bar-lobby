import { Type } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";

import { createMessageHandlers } from "@/model/messages";

export const battleAnnouncementHandlers = createMessageHandlers(
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
        regex: new RegExp(/\* Ringing (?<ringeeUsername>.*) \(by (?<ringerUsername>.*)\)/),
        schema: Type.Object({
            ringeeUsername: Type.String(),
            ringerUsername: Type.String(),
        }),
        async handler(data, message) {
            if (api.session.onlineUser.username === data.ringeeUsername) {
                api.notifications.event({
                    text: `${data.ringerUsername} rang you`,
                });
            }
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

            message.hide = true;
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
        regex: new RegExp(/\* User\(s\) allowed to vote/),
        schema: Type.Object({}),
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
        regex: new RegExp(/\* Awaiting following vote/),
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
        regex: new RegExp(/\* Away vote mode for/),
        schema: Type.Object({}),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/\* Warning: in-game IP address/),
        schema: Type.Object({}),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/\* Player "(?<username>.*)" has already been added at start/),
        schema: Type.Object({
            username: Type.String(),
        }),
        async handler(data, message) {
            message.hide = true;
        },
    }
);
