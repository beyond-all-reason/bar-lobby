import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Strict(
    Type.Object({
        email: Type.String({ default: "" }),
        token: Type.String({ default: "" }),
    })
);

export type Account = Static<typeof accountSchema>;
