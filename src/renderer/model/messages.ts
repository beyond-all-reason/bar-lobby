import { Static, TSchema } from "@sinclair/typebox";
import Ajv, { ValidateFunction } from "ajv";

export interface Message {
    type: "battle-message" | "direct-message" | "battle-announcement" | "direct-announcement";
    senderUserId: string;
    text: string;
    hide?: boolean;
    read?: boolean;
}

export type MessageHandler<T extends TSchema> = {
    regex: RegExp;
    schema: T;
    handler?: (data: Static<T>, message: Message) => Promise<void>;
    validator?: ValidateFunction;
};

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });

type MessageHandlersConfig<T extends readonly TSchema[]> = { [I in keyof T]: Omit<MessageHandler<T[I]>, "validator"> };
type MessageHandlers<T extends readonly TSchema[]> = { [I in keyof T]: MessageHandler<T[I]> };

export function createMessageHandlers<T extends readonly TSchema[]>(...responses: MessageHandlersConfig<T>) {
    return (responses as MessageHandlers<T>).map((response) => {
        response.validator = ajv.compile(response.schema);
        return response;
    });
}
