// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";
import { StartBox, Player } from "tachyon-protocol/types";

export const Lobby = Type.Object( {
    id: Type.String({ default: "" }),
    mapName: Type.String({ default: "" }),
	engineVersion: Type.String({ default: "" }),
	gameVersion: Type.String({ default: ""}),
	allyTeamConfig: Type.Object({
		startBox: {}, //not sure how to do this part?
		maxTeams: Type.Integer({minimum:1}),
		teams: Type.Object({
			maxPlayers: Type.Integer({minimum:1}),
		}),
	}),
	members: Type.Object({

	}),
	currentBattle: Type.Object({

	}),

});