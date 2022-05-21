export type BattleChatMessage = {
    type: "system";
    text: string;
} | {
    type: "chat";
    usedId: number;
    text: string;
};