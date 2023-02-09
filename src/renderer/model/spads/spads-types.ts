import { Static, TSchema } from "@sinclair/typebox";
import Ajv, { ValidateFunction } from "ajv";

import { SpadsBattle } from "@/model/battle/spads-battle";

export type SpadsCommandDefinition = {
    name: string;
    args: SpadsCommandArgumentDefinition<any>[];
    help: string;
};

export type SpadsCommandArgumentDefinition<T extends TSchema> = {
    name: string;
    schema: T;
};

export type SpadsResponse<T extends TSchema> = {
    name: string;
    regex: RegExp;
    schema?: T;
    handler?: (data: Static<T>, battle: SpadsBattle) => void;
    validator: ValidateFunction;
};

export type SpadsVote = {
    title: string;
    yesVotes: number;
    noVotes: number;
    maxVotes: number;
};

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });

type SpadsResponsesConfig<T extends readonly TSchema[]> = { [I in keyof T]: Omit<SpadsResponse<T[I]>, "validator"> };
type SpadsResponses<T extends readonly TSchema[]> = { [I in keyof T]: SpadsResponse<T[I]> };

export function defineSpadsResponses<T extends readonly TSchema[]>(...responses: SpadsResponsesConfig<T>) {
    return (responses as SpadsResponses<T>).map((response) => {
        if (response.schema) {
            response.validator = ajv.compile(response.schema);
        }
        return response;
    });
}
