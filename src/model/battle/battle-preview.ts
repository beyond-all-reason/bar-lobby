import { Static } from "@sinclair/typebox";
import { responses } from "tachyon-client";

export type BattlePreviewType = Static<typeof responses["s.lobby.query"]>["lobbies"][0];