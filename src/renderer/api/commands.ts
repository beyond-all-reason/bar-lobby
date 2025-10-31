// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { setupI18n } from "@renderer/i18n";
import AutoSuggestionOption from "@renderer/utils/auto-suggestion-option";

const i18n = setupI18n();

export interface Command {
    cmd: string;
    cmdDescription: string;
}

export function getAutoSuggestions(commands: Command[]): AutoSuggestionOption[] {
    const unique = new Set<string>();
    return commands.map((command) => {
        let suggestion = `/${command.cmd.substring(1)}`;
        if (unique.has(suggestion)) {
            suggestion = command.cmd.startsWith("!") ? suggestion + " (SPADS)" : suggestion + " (SERVER)";
        }
        unique.add(suggestion);
        return {
            suggestion: suggestion,
            description: command.cmdDescription,
            replaceSuggestion: command.cmd,
        };
    });
}

export const serverCommandList = [
    {
        cmd: "$help",
        cmdDescription: i18n.global.t("lobby.api.commands.help"),
    },
    {
        cmd: "$whoami",
        cmdDescription: i18n.global.t("lobby.api.commands.whoami"),
    },
    {
        cmd: "$whois",
        cmdDescription: i18n.global.t("lobby.api.commands.whois"),
    },
    {
        cmd: "$discord",
        cmdDescription: i18n.global.t("lobby.api.commands.discord"),
    },
    {
        cmd: "$mute",
        cmdDescription: i18n.global.t("lobby.api.commands.mute"),
    },
    {
        cmd: "$unmute",
        cmdDescription: i18n.global.t("lobby.api.commands.unmute"),
    },
    {
        cmd: "$coc",
        cmdDescription: i18n.global.t("lobby.api.commands.coc"),
    },
    {
        cmd: "$joinq",
        cmdDescription: i18n.global.t("lobby.api.commands.joinq"),
    },
    {
        cmd: "$leaveq",
        cmdDescription: i18n.global.t("lobby.api.commands.leaveq"),
    },
    {
        cmd: "$status",
        cmdDescription: i18n.global.t("lobby.api.commands.status"),
    },
    {
        cmd: "$afks",
        cmdDescription: i18n.global.t("lobby.api.commands.afks"),
    },
    {
        cmd: "$password?",
        cmdDescription: i18n.global.t("lobby.api.commands.password"),
    },
    {
        cmd: "$splitlobby",
        cmdDescription: i18n.global.t("lobby.api.commands.splitlobby"),
    },
    {
        cmd: "$roll",
        cmdDescription: i18n.global.t("lobby.api.commands.roll"),
    },
    {
        cmd: "$explain",
        cmdDescription: i18n.global.t("lobby.api.commands.explain"),
    },
    {
        cmd: "$reset-approval",
        cmdDescription: i18n.global.t("lobby.api.commands.reset-approval"),
    },
    {
        cmd: "$meme",
        cmdDescription: i18n.global.t("lobby.api.commands.meme"),
    },
    {
        cmd: "$welcome-message",
        cmdDescription: i18n.global.t("lobby.api.commands.welcome-message"),
    },
    {
        cmd: "$gatekeeper",
        cmdDescription: i18n.global.t("lobby.api.commands.gatekeeper"),
    },
    {
        cmd: "$rename",
        cmdDescription: i18n.global.t("lobby.api.commands.rename"),
    },
    {
        cmd: "$resetratinglevels",
        cmdDescription: i18n.global.t("lobby.api.commands.resetratinglevels"),
    },
    {
        cmd: "$minratinglevel",
        cmdDescription: i18n.global.t("lobby.api.commands.minratinglevel"),
    },
    {
        cmd: "$maxratinglevel ",
        cmdDescription: i18n.global.t("lobby.api.commands.maxratinglevel"),
    },
    {
        cmd: "$setratinglevels",
        cmdDescription: i18n.global.t("lobby.api.commands.setratinglevels"),
    },
];
