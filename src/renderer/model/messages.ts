import { Static, TSchema } from "@sinclair/typebox";
import Ajv, { ValidateFunction } from "ajv";
import { SetOptional } from "type-fest";

export interface Message {
    type: "battle-message" | "direct-message" | "battle-announcement" | "direct-announcement";
    senderUserId: number;
    text: string;
    hide?: boolean;
}

export type MessageHandler<T extends TSchema> = {
    regex: RegExp;
    schema: T;
    handler?: (data: Static<T>, message: Message) => Promise<void>;
    validator?: ValidateFunction;
};

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });

type MessageHandlersConfig<T extends readonly TSchema[]> = { [I in keyof T]: SetOptional<Omit<MessageHandler<T[I]>, "validator">, "schema"> };
type MessageHandlers<T extends readonly TSchema[]> = { [I in keyof T]: MessageHandler<T[I]> };

export function createMessageHandlers<T extends readonly TSchema[]>(...responses: MessageHandlersConfig<T>) {
    return (responses as MessageHandlers<T>).map((response) => {
        if (response.schema) {
            response.validator = ajv.compile(response.schema);
        }
        return response;
    });
}
