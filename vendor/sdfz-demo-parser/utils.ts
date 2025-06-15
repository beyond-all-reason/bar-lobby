// SPDX-FileCopyrightText: 2024 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT AND Unlicense
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/demo-parser

import { DemoModel } from ".";

export function isPlayer(playerOrAI: DemoModel.Info.Player | DemoModel.Info.AI): playerOrAI is DemoModel.Info.Player {
    return "userId" in playerOrAI;
}

export function isSpec(playerOrSpec: DemoModel.Info.Player | DemoModel.Info.Spectator): playerOrSpec is DemoModel.Info.Spectator {
    return "teamId" in playerOrSpec;
}

export function isPacket<ID extends DemoModel.Packet.ID>(packet: DemoModel.Packet.AbstractPacket, packetId: ID): packet is DemoModel.Packet.AbstractPacket<ID> {
    return packet.id === packetId;
}
