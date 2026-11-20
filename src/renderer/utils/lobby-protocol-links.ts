// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

function escapeMarkdown(text: string): string {
    return text.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}[\]()<>#+\-.!|~&"']/g, "\\$&");
}

export function resolveLobbyProtocolLabel(rawUrl: string, labels: Record<string, string>): string | null {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }
    const template = labels[`${url.hostname}/${url.pathname.slice(1)}`];
    if (!template) return null;
    return template.replace(/\{(\w+)\}/g, (_m, param) => escapeMarkdown(url.searchParams.get(param) ?? param));
}

export function linkifyLobbyProtocolUrls(text: string, scheme: string, labels: Record<string, string>): string {
    const pattern = new RegExp(`(?<![([])${scheme}://[^\\s)\\]>]+`, "g");
    return text.replace(pattern, (match) => {
        const label = resolveLobbyProtocolLabel(match, labels);
        return `[${label ?? match}](${match})`;
    });
}
