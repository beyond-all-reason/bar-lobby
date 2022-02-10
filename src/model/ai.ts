export type AIConfig = {
    fullName: string;
    shortName: string;
    version?: string;
    options?: any;
};

/** @todo can this be generated automatically from data files? */
export const aiConfigs: AIConfig[] = [
    {
        fullName: "BARbarianAI",
        shortName: "BARb",
        version: "stable"
    }
];