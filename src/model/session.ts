import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";

export const sessionSchema = Type.Strict(Type.Object({
    offline: Type.Boolean({ default: true }),
    user: Type.Optional(Type.Object({
        id: Type.Number(),
        springId: Type.Union([Type.Number(), Type.String()]), // TODO: Server needs to fix this
        name: Type.String(),
        bot: Type.Boolean(),
        clanId: Type.Union([Type.Number(), Type.Null()]),
        friendRequestIds: Type.Array(Type.Number()),
        friendIds: Type.Array(Type.Number())
    }))
}));

export type SessionType = Static<typeof sessionSchema>;