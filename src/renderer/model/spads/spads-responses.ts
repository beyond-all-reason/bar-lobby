import { Type } from "@sinclair/typebox";
import { assign } from "jaz-ts-utils";

import { defineSpadsResponses, SpadsVote } from "@/model/spads/spads-types";

export const spadsResponseDefinitions = defineSpadsResponses(
    {
        // * Hi jaztest1! Current battle type is team.
        name: "hi",
        regex: new RegExp(/\* Hi (?<username>.*)! Current battle type is (?<preset>.*)\./),
        schema: Type.Object({
            username: Type.String(),
            preset: Type.String(),
        }),
    },
    {
        name: "add-spectator",
        regex: new RegExp(/\* Adding user (?<username>.*) as spectator/),
        schema: Type.Object({
            username: Type.String(),
        }),
    },
    {
        // * jaztest1 called a vote for command "start" [!vote y, !vote n, !vote b]
        name: "vote-started",
        regex: new RegExp(/\* (?<username>.*) called a vote for command "(?<command>.*)"/),
        schema: Type.Object({
            username: Type.String(),
            command: Type.String(),
        }),
    },
    {
        // * Vote in progress: "start" [y:4/8, n:0/7] (40s remaining)
        // * Vote in progress: "set map Tempest_V3" [y:2/6(9), n:0/6(8)] (25s remaining)
        name: "vote-in-progress",
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
        handler(data, battle) {
            const vote: SpadsVote = data;

            if (battle.currentVote.value) {
                assign(battle.currentVote.value, vote);
            } else {
                battle.currentVote.value = vote;
            }
        },
    },
    {
        // * Vote for command "start" passed.
        name: "vote-passed",
        regex: new RegExp(/\* Vote for command "(?<command>.*)" passed./),
        schema: Type.Object({
            command: Type.String(),
        }),
        handler(data, battle) {
            battle.currentVote.value = null;
        },
    },
    {
        // * Vote for command "lock" failed (delay expired, away vote mode activated for 7 users).
        // * Vote for command "resign jaztest1 TEAM" failed.
        name: "vote-failed",
        regex: new RegExp(/\* Vote for command "(?<command>.*)" failed(?: \(delay expired, away vote mode activated for (?<awayCount>\d*) users\))?./),
        schema: Type.Object({
            command: Type.String(),
            awayCount: Type.Optional(Type.Number()),
        }),
        handler(data, battle) {
            battle.currentVote.value = null;
        },
    },
    {
        // * BarManager|{"BattleStateChanged": {"locked": "unlocked", "autoBalance": "advanced", "teamSize": "8", "nbTeams": "2", "balanceMode": "clan;skill", "preset": "team"}}
        name: "battle-state-changed",
        regex: new RegExp(/\* BarManager\|{"BattleStateChanged": (?<json>.*)\}/),
        schema: Type.Object({
            json: Type.String(),
        }),
        handler(data, battle) {
            console.log(data);
        },
    },
    {
        // * 13 users allowed to vote.
        name: "users-allowed-to-vote",
        regex: new RegExp(/\* (?<numOfUsersAllowedToVote>\d*) users allowed to vote./),
        schema: Type.Object({
            numOfUsersAllowedToVote: Type.Number(),
        }),
    },
    {
        // * lamancha, you have already voted for current vote.
        name: "user-already-voted",
        regex: new RegExp(/\* (?<username>.*), you have already voted for current vote./),
        schema: Type.Object({
            username: Type.Number(),
        }),
    },
    {
        // * lamancha, you have already voted for current vote.
        name: "user-already-voted",
        regex: new RegExp(/\* (?<username>.*), you have already voted for current vote./),
        schema: Type.Object({
            username: Type.Number(),
        }),
    }
);

// * raptortomas57, you are not allowed to vote for current vote.
// * User(s) allowed to vote: fan,[Phoenix],[SPM]B000M,Flash,Hyldenchamp
// * Vote in progress: "start" [y:4/8, n:0/7] (40s remaining)
// * Away vote mode for future,NoGoD,art33mu3,[CoW]LostKnight,[DE]resopmok
// * Awaiting following vote(s): fan (and 2 away-mode vote(s))
// * Vote for command "start" passed.
// * Map changed by [SPM]B000M: Eye Of Horus 1.7
// * Vote for command "set map The Halite Maze v1.2" passed (delay expired, away vote mode activated for fan).
// * BarManager|{"onVoteStart": {"user": "[SPM]B000M", "command": ["set", "map", "Eye", "Of", "Horus", "1.7"]}}
// * BarManager|{"BattleStateChanged": {"locked": "unlocked", "autoBalance": "advanced", "teamSize": "8", "nbTeams": "2", "balanceMode": "skill", "preset": "team"}}
// * Balancing according to current balance mode: skill (teams were already balanced, balance deviation: 24%)
// * Hi Silencer1701! Current battle type is team.
// * Server stopped (running time: 49 minutes and 1 second)
// * Damage award: [SPM]B000M (total damage: 540K.)
// * Eco award: Erun (resources produced: 18309K.)
// * Micro award: raptortomas57 (damage efficiency: 137%)
// * Player "Sandec" has already been added at start
// * Adding user fan as spectator
// * Balancing according to current balance mode: skill (teams were already balanced, balance deviation: 24%)
// * Balancing according to current balance mode: clan;skill (balance deviation: 1%)
// * Ally team 0 won! (moep, WingR, StarDoM, raptortomas57, TArules, VINT, Panalo, ProAustralian)
// *   Damage award:  raptortomas57  (total damage: 473K.)
// *   Eco award:     Panalo         (resources produced: 64102K.)  [ OWNAGE! ]
// *   Micro award:   markivs        (damage efficiency: 162%)
// * In-game mute added for YEP by Coordinator (type: full, duration: one game)
