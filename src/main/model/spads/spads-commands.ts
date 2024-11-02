import { Type } from "@sinclair/typebox";
import { DeepReadonly } from "vue";
import { SpadsCommandDefinition } from "./spads-types";

// TODO

// this data could be automatically parsed from spads !helpall output, either on launch or as a compile-time script
export const spadsCommandDefinitions = [
    {
        name: "help",
        args: [
            {
                name: "command",
                schema: Type.Optional(Type.String()),
            },
        ],
        help: "Get information about a particular command",
    },
] as const satisfies DeepReadonly<SpadsCommandDefinition[]>;
