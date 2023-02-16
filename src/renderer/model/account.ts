import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Object({
    email: Type.String({ default: "" }),
    token: Type.String({ default: "" }),
});
