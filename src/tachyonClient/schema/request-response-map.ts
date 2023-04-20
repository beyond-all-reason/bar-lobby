import { requests } from "~/model/requests";
import { responses } from "~/model/responses";

function shape<T extends { [key in keyof typeof requests]?: keyof typeof responses }>(value: T): T {
    return value;
}

// https://github.com/beyond-all-reason/teiserver/tree/master/documents/tachyon

export const requestResponseMap = shape({
    // auth
    "c.auth.register": "s.auth.register",
    "c.auth.get_token": "s.auth.get_token",
    "c.auth.login": "s.auth.login",
    "c.auth.verify": "s.auth.verify",

    // communication
    "c.communication.send_direct_message": "s.communication.send_direct_message",

    // lobby
    "c.lobby.query": "s.lobby.query",
    "c.lobby.join": "s.lobby.join",
    "c.lobby.leave": "s.lobby.leave",
    "c.lobbyy.add_bot": "s.lobby.add_bot",
    "c.lobbyy.update_bot": "s.lobby.update_bot",
    "c.lobbyy.remove_bot": "s.lobby.remove_bot",

    //system
    "c.system.ping": "s.system.pong",

    // user
    "c.user.list_users_from_ids": "s.user.user_list",
    "c.user.list_friend_users_and_clients": "s.user.list_friend_users_and_clients",

    // matchmaking
    "c.matchmaking.query": "s.matchmaking.query",
    "c.matchmaking.get_queue_info": "s.matchmaking.queue_info",
    "c.matchmaking.accept": "s.matchmaking.match_ready",
} as const);
