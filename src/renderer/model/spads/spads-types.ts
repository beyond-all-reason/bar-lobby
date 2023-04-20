import { TSchema } from "@sinclair/typebox";

export type SpadsCommandDefinition = {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: SpadsCommandArgumentDefinition<any>[];
    help: string;
};

export type SpadsCommandArgumentDefinition<T extends TSchema> = {
    name: string;
    schema: T;
};

export type SpadsVote = {
    command: string;
    callerName?: string;
    yesVotes?: number;
    requiredYesVotes?: number;
    maxYesVotes?: number;
    noVotes?: number;
    requiredNoVotes?: number;
    maxNoVotes?: number;
    secondsRemaining?: number;
};
