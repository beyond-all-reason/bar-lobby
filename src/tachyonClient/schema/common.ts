import { Type } from "@sinclair/typebox";

export const userSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    bot: Type.Boolean(),
    clan_id: Type.Union([
        Type.Number(),
        Type.Null(),
    ]),
    country: Type.String(),
    icons: Type.Record(Type.String(), Type.Any()),
});

export const myUserSchema = Type.Intersect(
    [
        userSchema,
        Type.Object({
            friend_requests: Type.Array(Type.Number()),
            friends: Type.Array(Type.Number()),
            permissions: Type.Array(Type.String()),
        }),
    ],
    { unevaluatedProperties: false }
);

export const baseClientSchema = Type.Object({
    ready: Type.Boolean(),
    player: Type.Boolean(),
    team_number: Type.Number(),
    player_number: Type.Number(),
    team_colour: Type.String(),
    sync: Type.Object({
        engine: Type.Number(),
        game: Type.Number(),
        map: Type.Number(),
    }),
});

export const playerSpecificSchema = Type.Object({
    userid: Type.Number(),
    lobby_id: Type.Union([
        Type.Number(),
        Type.Null(),
    ]),
    away: Type.Boolean(),
    in_game: Type.Boolean(),
    clan_tag: Type.Union([
        Type.String(),
        Type.Null(),
    ]),
    party_id: Type.Union([
        Type.String(),
        Type.Null(),
    ]),
    muted: Type.Boolean(),
});

export const botSpecificSchema = Type.Object({
    owner_id: Type.Number(),
    owner_name: Type.String(),
    ai_dll: Type.String(),
    handicap: Type.Number(),
    side: Type.Number(),
    name: Type.String(),
});

export const playerSchema = Type.Intersect(
    [
        baseClientSchema,
        playerSpecificSchema,
    ],
    { unevaluatedProperties: false }
);

export const botSchema = Type.Intersect(
    [
        baseClientSchema,
        botSpecificSchema,
    ],
    { unevaluatedProperties: false }
);

export const lobbySchema = Type.Object({
    disabled_units: Type.Array(Type.String()),
    engine_name: Type.String(),
    engine_version: Type.String(),
    founder_id: Type.Number(),
    game_name: Type.String(),
    id: Type.Number(),
    in_progress: Type.Boolean(),
    ip: Type.String(),
    port: Type.Number(),
    locked: Type.Boolean(),
    map_hash: Type.String(),
    map_name: Type.String(),
    max_players: Type.Number(),
    name: Type.String(),
    passworded: Type.Boolean(),
    players: Type.Array(Type.Number()),
    started_at: Type.Union([
        Type.Number(),
        Type.Null(),
    ]),
    type: Type.String(),
    // TODO: https://github.com/beyond-all-reason/teiserver/issues/45
    start_areas: Type.Record(
        Type.Number(),
        Type.Object({
            shape: Type.String(),
            x1: Type.Number(),
            x2: Type.Number(),
            y1: Type.Number(),
            y2: Type.Number(),
        })
    ),
});
