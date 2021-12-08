import { Type, Static } from "@sinclair/typebox";

export const sessionSchema = Type.Strict(Type.Object({
    settingsOpen: Type.Boolean({ default: false })
}));

export type SessionType = Static<typeof sessionSchema>;