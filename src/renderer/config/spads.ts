export type SpadsCommandDefinition = {
    key: string;
    name: string;
    args: SpadsCommandArgumentDefinition[];
    help: string;
};

export type SpadsCommandArgumentDefinition<T extends string | number | boolean = string> = {
    key: string;
    name: string;
    optional: boolean;
    type: T;
    default: T;
};

export type SpadsVote = {
    title: string;
    yesVotes: number;
    noVotes: number;
    maxVotes: number;
};
