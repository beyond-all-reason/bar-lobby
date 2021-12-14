import { Type, Static } from "@sinclair/typebox";

export const sessionSchema = Type.Strict(Type.Object({
}));

export type SessionType = Static<typeof sessionSchema>;