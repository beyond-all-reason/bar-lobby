import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Object({
    token: Type.String({ default: "" }),
    refreshToken: Type.String({ default: "" }),
});
