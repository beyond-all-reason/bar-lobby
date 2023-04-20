import { Type } from "@sinclair/typebox";

import { botSchema, lobbySchema, myUserSchema, playerSchema, playerSpecificSchema, userSchema } from "./common";

export const battleSchema = Type.Object({
    lobby: lobbySchema,
    bots: Type.Optional(Type.Record(Type.String(), botSchema)),
    modoptions: Type.Optional(Type.Record(Type.String(), Type.String())),
    member_list: Type.Optional(Type.Array(playerSpecificSchema)),
    script_password: Type.Optional(Type.String()),
});

export const responses = {
    // auth
    "s.auth.register": Type.Object({
        result: Type.String(),
        reason: Type.Optional(Type.String()),
    }),
    "s.auth.get_token": Type.Object({
        result: Type.String(),
        token: Type.Optional(Type.String()),
        reason: Type.Optional(Type.String()),
    }),
    "s.auth.login": Type.Object({
        result: Type.String(),
        agreement: Type.Optional(Type.String()),
        reason: Type.Optional(Type.String()),
        user: Type.Optional(myUserSchema),
    }),
    "s.auth.verify": Type.Object({
        result: Type.String(),
        user: Type.Optional(myUserSchema),
        reason: Type.Optional(Type.String()),
    }),

    // communication
    "s.communication.send_direct_message": Type.Object({
        result: Type.String(),
    }),
    "s.communication.received_direct_message": Type.Object({
        sender_id: Type.Number(),
        message: Type.String(),
    }),

    // system
    "s.system.server_event": Type.Object({
        event: Type.String(),
        node: Type.String(),
    }),
    "s.system.pong": Type.Object({
        time: Type.Number(),
    }),
    "s.system.watch": Type.Object({
        channel: Type.String(),
        result: Type.String(),
    }),
    "s.system.server_stats": Type.Object({
        data: Type.Object({
            in_progress_lobby_count: Type.Number(),
            lobby_count: Type.Number(),
            player_count: Type.Number(),
            user_count: Type.Number(),
        }),
    }),

    // lobby
    "s.lobby.query": Type.Object({
        result: Type.String(),
        lobbies: Type.Array(battleSchema),
    }),
    "s.lobby.join": Type.Object({
        result: Type.Union([Type.Literal("waiting_for_host"), Type.Literal("failure")]),
        reason: Type.Optional(Type.String()),
    }),
    "s.lobby_host.request_to_join": Type.Object({
        userid: Type.Number(),
    }),
    "s.lobby.joined": battleSchema,
    "s.lobby.announce": Type.Object({
        lobby_id: Type.Number(),
        message: Type.String(),
        sender_id: Type.Number(),
    }),
    "s.lobby.updated": battleSchema,
    "s.lobby.create": Type.Union([
        Type.Intersect([
            Type.Object({
                result: Type.Literal("success"),
            }),
            battleSchema,
        ]),
        Type.Object({
            result: Type.Literal("failure"),
            reason: Type.String(),
        }),
    ]),
    "s.lobby.say": Type.Object({
        lobby_id: Type.Number(),
        sender_id: Type.Number(),
        message: Type.String(),
    }),
    "s.lobby.updated_client_battlestatus": Type.Object({
        client: playerSchema,
        lobby_id: Type.Number(),
        reason: Type.String(),
    }),
    "s.lobby.set_modoptions": Type.Object({
        lobby_id: Type.Number(),
        new_options: Type.Record(Type.String(), Type.String()),
    }),
    "s.lobby.remove_modoptions": Type.Object({
        lobby_id: Type.Number(),
        keys: Type.Array(Type.String()),
    }),
    "s.lobby.remove_user": Type.Object({
        leaver_id: Type.Number(),
        lobby_id: Type.Number(),
    }),
    "s.lobby.leave": Type.Object({
        result: Type.Literal("success"),
    }),
    "s.lobby.update_values": Type.Object({
        lobby_id: Type.Number(),
        new_values: Type.Partial(lobbySchema),
    }),
    "s.lobby.add_user": Type.Object({
        joiner_id: Type.Number(),
        lobby_id: Type.Number(),
        user: userSchema,
        client: playerSchema,
    }),
    "s.lobby.closed": Type.Object({
        lobby_id: Type.Number(),
    }),
    "s.lobby.add_start_area": Type.Object({
        area_id: Type.Number(),
        lobby_id: Type.Number(),
        structure: Type.Object({
            shape: Type.String(),
            x1: Type.Number(),
            y1: Type.Number(),
            x2: Type.Number(),
            y2: Type.Number(),
        }),
    }),
    "s.lobby.remove_start_area": Type.Object({
        area_id: Type.Number(),
        lobby_id: Type.Number(),
    }),
    "s.lobby.add_bot": Type.Object({
        bot: botSchema,
    }),
    "s.lobby.update_bot": Type.Object({
        bot: botSchema,
    }),
    "s.lobby.remove_bot": Type.Object({
        bot_name: Type.String(),
    }),
    "s.lobby.received_lobby_direct_announce": Type.Object({
        message: Type.String(),
        sender_id: Type.Number(),
    }),
    "s.lobby.updated_queue": Type.Object({
        lobby_id: Type.Number(),
        queue: Type.Array(Type.Number()),
    }),

    // user
    "s.user.user_list": Type.Object({
        users: Type.Array(userSchema),
        clients: Type.Optional(Type.Array(playerSchema)),
    }),
    "s.user.list_friend_ids": Type.Object({
        friend_id_list: Type.Array(Type.Number()),
        request_id_list: Type.Array(Type.Number()),
    }),
    "s.user.list_friend_users_and_clients": Type.Object({
        user_list: Type.Array(userSchema),
        client_list: Type.Array(playerSchema),
    }),
    "s.user.friend_request": Type.Object({
        user_id: Type.Number(),
    }),
    "s.user.friend_added": Type.Object({
        user_id: Type.Number(),
    }),
    "s.user.friend_removed": Type.Object({
        user_id: Type.Number(),
    }),
    //matchmaking
    "s.matchmaking.query": Type.Object({
        matchmaking_list: Type.Array(Type.Object({
            queue_id: Type.Number(),
            name: Type.String(),
            mean_wait_time: Type.Number(),
            group_count: Type.Number(),
        }))
    }),
    "s.matchmaking.queue_info": Type.Object({
        queue: Type.Object({
            queue_id: Type.Number(),
            name: Type.String(),
            mean_wait_time: Type.Number(),
            group_count: Type.Number(),
        })
    }),
    "s.matchmaking.match_ready": Type.Object({
        match_id: Type.String(),
        queue_id: Type.Number(),
    }),
    "s.matchmaking.match_declined": Type.Object({
        match_id: Type.String(),
        queue_id: Type.Number(),
    }),
    "s.matchmaking.match_cancelled": Type.Object({
        match_id: Type.String(),
        queue_id: Type.Number(),
    }),


} as const;
const responseKeys = Object.keys(responses) as  (keyof typeof responses)[] ;
export type TachyonResponseCommand = typeof responseKeys[number];