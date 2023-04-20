import { Type } from "@sinclair/typebox";

import { baseClientSchema } from "./common";
export const requests = {
    /**
     * auth
     */
    "c.auth.register": Type.Object({
        username: Type.String(),
        email: Type.String(),
        password: Type.String(),
    }),
    "c.auth.get_token": Type.Object({
        email: Type.String(),
        password: Type.String(),
    }),
    "c.auth.login": Type.Object({
        token: Type.String(),
        lobby_name: Type.String(),
        lobby_version: Type.String(),
        lobby_hash: Type.String(),
    }),
    "c.auth.verify": Type.Object({
        token: Type.String(),
        code: Type.String(),
    }),
    "c.auth.disconnect": Type.Void(),
    /**
     * communication
     */
    "c.communication.send_direct_message": Type.Object({
        recipient_id: Type.Number(),
        message: Type.String(),
    }),
    /**
     * lobby
     */
    "c.lobby.query": Type.Object({
        query: Type.Object({
            locked: Type.Optional(Type.Boolean()),
            in_progress: Type.Optional(Type.Boolean()),
        }),
        fields: Type.Array(Type.String()),
    }),
    "c.lobby.join": Type.Object({
        lobby_id: Type.Number(),
        password: Type.Optional(Type.String()),
    }),
    "c.lobby_host.respond_to_join_request": Type.Object({
        userid: Type.Number(),
        response: Type.String(),
        reason: Type.Union([
            Type.Literal("approve"),
            Type.Literal("reject"),
        ]),
    }),
    "c.lobby.leave": Type.Void(),
    "c.lobby.create": Type.Object({
        name: Type.String(),
        nattype: Type.String(),
        password: Type.Optional(Type.String()),
        port: Type.Number(),
        game_hash: Type.String(),
        map_hash: Type.String(),
        map_name: Type.String(),
        game_name: Type.String(),
        engine_name: Type.String(),
        engine_version: Type.String(),
        settings: Type.Object({
            max_players: Type.Number(),
        }),
    }),
    "c.lobby.update_status": Type.Object({
        client: Type.Partial(baseClientSchema),
    }),
    "c.lobby.message": Type.Object({
        message: Type.String(),
    }),
    "c.lobby.add_bot": Type.Object({
        name: Type.String(),
        ai_dll: Type.String(),
        status: Type.Object({
            // TODO: needs to be more DRY
            player_number: Type.Number(),
            team_number: Type.Number(),
            team_color: Type.String(),
            side: Type.Number(),
        }),
    }),
    "c.lobby.update_bot": Type.Object({
        name: Type.String(),
        status: Type.Object({
            // TODO: needs to be more DRY
            player_number: Type.Number(),
            team_number: Type.Number(),
            team_color: Type.String(),
            side: Type.Number(),
        }),
    }),
    "c.lobby.remove_bot": Type.Object({
        name: Type.String(),
    }),
    /**
     * system
     */
    "c.system.ping": Type.Void(),
    "c.system.watch": Type.Object({
        channel: Type.String(),
    }),
    /**
     * user
     */
    "c.user.list_users_from_ids": Type.Object({
        id_list: Type.Array(Type.Number()),
        include_clients: Type.Optional(Type.Boolean({ default: false })),
    }),
    "c.user.list_friend_ids": Type.Object({
        friend_id_list: Type.Array(Type.Number()),
        request_id_list: Type.Array(Type.Number()),
    }),
    "c.user.list_friend_users_and_clients": Type.Void(),
    "c.user.add_friend": Type.Object({
        user_id: Type.Number(),
    }),
    "c.user.rescind_friend_request": Type.Object({
        user_id: Type.Number(),
    }),
    "c.user.accept_friend_request": Type.Object({
        user_id: Type.Number(),
    }),
    "c.user.reject_friend_request": Type.Object({
        user_id: Type.Number(),
    }),
    "c.user.remove_friend": Type.Object({
        user_id: Type.Number(),
    }),
    //matchmaking
    "c.matchmaking.query": Type.Object({
        query: Type.Object({
            ranked: Type.Boolean(),
            user_id: Type.Number(),
        })
    }),
    "c.matchmaking.get_queue_info": Type.Object({
        queue_id: Type.Number(),
    }),
    "c.matchmaking.join_queue": Type.Object({
        user_id: Type.Number(),
        queue_id: Type.Number(),
    }),
    "c.matchmaking.leave_queue": Type.Object({
        user_id: Type.Number(),
        queue_id: Type.Number(),
    }),
    "c.matchmaking.leave_all_queues": Type.Object({
        user_id: Type.Number(),
    }),
    "c.matchmaking.accept": Type.Object({
        user_id: Type.Number(),
        match_id: Type.String(),
    }),
    "c.matchmaking.decline": Type.Object({
        user_id: Type.Number(),
    }),
    //todo "c.matchmaking.list_my_queues": Type.Obejct({}), currently not defined in the tachyon documents

} as const;

const requestKeys = Object.keys(requests) as (keyof typeof requests)[];
export type TachyonRequestCommand = typeof requestKeys[number];