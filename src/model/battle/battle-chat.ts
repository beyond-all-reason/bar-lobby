export type BattleChatMessage =
    | {
          type: "system";
          text: string;
      }
    | {
          type: "chat";
          name: string;
          text: string;
      };
