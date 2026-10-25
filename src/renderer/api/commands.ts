// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { t, type TranslationKey } from "@renderer/i18n";
import AutoSuggestionOption from "@renderer/utils/auto-suggestion-option";

export interface Command {
    cmd: string;
    descriptionKey: TranslationKey;
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
            description: t(command.descriptionKey),
            replaceSuggestion: command.cmd,
        };
    });
}

export const serverCommandList: Command[] = [
    {
        cmd: "$help",
        descriptionKey: "lobby.api.commands.help",
    },
    {
        cmd: "$whoami",
        descriptionKey: "lobby.api.commands.whoami",
    },
    {
        cmd: "$whois",
        descriptionKey: "lobby.api.commands.whois",
    },
    {
        cmd: "$discord",
        descriptionKey: "lobby.api.commands.discord",
    },
    {
        cmd: "$mute",
        descriptionKey: "lobby.api.commands.mute",
    },
    {
        cmd: "$unmute",
        descriptionKey: "lobby.api.commands.unmute",
    },
    {
        cmd: "$coc",
        descriptionKey: "lobby.api.commands.coc",
    },
    {
        cmd: "$joinq",
        descriptionKey: "lobby.api.commands.joinq",
    },
    {
        cmd: "$leaveq",
        descriptionKey: "lobby.api.commands.leaveq",
    },
    {
        cmd: "$status",
        descriptionKey: "lobby.api.commands.status",
    },
    {
        cmd: "$afks",
        descriptionKey: "lobby.api.commands.afks",
    },
    {
        cmd: "$password?",
        descriptionKey: "lobby.api.commands.password",
    },
    {
        cmd: "$splitlobby",
        descriptionKey: "lobby.api.commands.splitLobby",
    },
    {
        cmd: "$roll",
        descriptionKey: "lobby.api.commands.roll",
    },
    {
        cmd: "$explain",
        descriptionKey: "lobby.api.commands.explain",
    },
    {
        cmd: "$reset-approval",
        descriptionKey: "lobby.api.commands.resetApproval",
    },
    {
        cmd: "$meme",
        descriptionKey: "lobby.api.commands.meme",
    },
    {
        cmd: "$welcome-message",
        descriptionKey: "lobby.api.commands.welcomeMessage",
    },
    {
        cmd: "$gatekeeper",
        descriptionKey: "lobby.api.commands.gatekeeper",
    },
    {
        cmd: "$rename",
        descriptionKey: "lobby.api.commands.rename",
    },
    {
        cmd: "$resetratinglevels",
        descriptionKey: "lobby.api.commands.resetRatingLevels",
    },
    {
        cmd: "$minratinglevel",
        descriptionKey: "lobby.api.commands.minRatingLevel",
    },
    {
        cmd: "$maxratinglevel ",
        descriptionKey: "lobby.api.commands.maxRatingLevel",
    },
    {
        cmd: "$setratinglevels",
        descriptionKey: "lobby.api.commands.setRatingLevels",
    },
];
