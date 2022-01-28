import { Type, Static } from "@sinclair/typebox";
import { serverCommandSchema } from "tachyon-client/dist/model/commands/server-commands";

const loginSchema = serverCommandSchema["s.auth.login"].properties.user;

export const sessionSchema = Type.Strict(Type.Object({
    offline: Type.Boolean({ default: true }),
    account: Type.Optional(loginSchema)
}));

export type SessionType = Static<typeof sessionSchema>;