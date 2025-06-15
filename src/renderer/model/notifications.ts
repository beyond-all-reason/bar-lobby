// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * Alerts are for displaying informative messages to the user, but aren't directly tied to any expected action.
 * They should typically be displayed at times when the user is using the lobby, and will notice them naturally.
 *
 * Examples:
 * - announcement of upcoming server downtime
 * - kicked from a battle
 */
export type Alert = {
    id: string;
    text: string;
    timeoutMs?: number;
    severity?: "info" | "warning" | "error";
};

/**
 * Events are for important, possibly interactive notifications, and will commonly occur when the lobby is minimized, so
 *  they will also flash the app icon and play a sound to get the user's attention.
 *
 * Examples:
 * - invited to a party
 * - !ring
 */
export type Event = {
    id: string;
    text: string;
    timeoutMs?: number;
    playSound?: boolean;
    action?: () => void;
};
